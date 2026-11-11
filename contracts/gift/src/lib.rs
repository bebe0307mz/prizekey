//! PrizeKey: a transferable NEAR claim whose present owner can request a native BTC signature.
//! Each claim's Bitcoin key is derived from this contract account and a claim-specific path.
//! Once a signature is requested, transfer is disabled to prevent an old holder from spending
//! Bitcoin after passing the claim to someone else.

use near_sdk::serde_json::{self, json};
use near_sdk::store::IterableMap;
use near_sdk::{env, near, AccountId, BorshStorageKey, Gas, NearToken, PanicOnDefault, Promise, PromiseError};

const MPC: &str = "v1.signer-prod.testnet";
const MIN_CREATE_DEPOSIT: NearToken = NearToken::from_millinear(10);
const MAX_GIFTS: u64 = 1_000;

#[derive(BorshStorageKey)]
#[near]
enum StorageKey { Gifts }

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Gift {
    pub id: u64,
    pub owner_id: AccountId,
    pub title: String,
    pub message: String,
    pub created_at_ms: u64,
    pub pending: bool,
    pub redemption_started: bool,
    pub request_id: u64,
    pub last_payload_hex: Option<String>,
    pub last_signature: Option<String>,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct GiftContract {
    gifts: IterableMap<u64, Gift>,
    next_id: u64,
}

#[near]
impl GiftContract {
    #[init]
    pub fn new() -> Self {
        Self { gifts: IterableMap::new(StorageKey::Gifts), next_id: 0 }
    }

    #[payable]
    pub fn create_gift(&mut self, title: String, message: String) -> Gift {
        assert!(env::attached_deposit() >= MIN_CREATE_DEPOSIT, "attach at least 0.01 NEAR for storage");
        assert!(!title.trim().is_empty() && title.len() <= 80, "title must be 1 to 80 bytes");
        assert!(message.len() <= 240, "message exceeds 240 bytes");
        assert!(self.next_id < MAX_GIFTS, "gift limit reached");
        let id = self.next_id;
        self.next_id += 1;
        let gift = Gift {
            id, owner_id: env::predecessor_account_id(), title, message,
            created_at_ms: env::block_timestamp_ms(), pending: false, redemption_started: false,
            request_id: 0, last_payload_hex: None, last_signature: None,
        };
        self.gifts.insert(id, gift.clone());
        env::log_str(&format!("EVENT_JSON:{}", json!({"standard":"nep171","version":"1.0.0","event":"nft_mint","data":[{"owner_id":gift.owner_id,"token_ids":[id.to_string()]}]})));
        gift
    }

    /// NEP-171 core transfer. Signed or signing claims cannot be transferred.
    #[payable]
    pub fn nft_transfer(&mut self, receiver_id: AccountId, token_id: String, approval_id: Option<u64>, memo: Option<String>) {
        assert_eq!(env::attached_deposit(), NearToken::from_yoctonear(1), "attach exactly 1 yoctoNEAR");
        assert!(approval_id.is_none(), "approvals are unsupported");
        let id = parse_id(&token_id);
        let mut gift = self.gifts.get(&id).cloned().expect("unknown gift");
        let sender = env::predecessor_account_id();
        assert_eq!(sender, gift.owner_id, "only the current owner can transfer");
        assert_ne!(receiver_id, sender, "receiver is owner");
        assert!(!gift.redemption_started, "redemption started; transfer locked");
        gift.owner_id = receiver_id.clone();
        self.gifts.insert(id, gift);
        env::log_str(&format!("EVENT_JSON:{}", json!({"standard":"nep171","version":"1.0.0","event":"nft_transfer","data":[{"old_owner_id":sender,"new_owner_id":receiver_id,"token_ids":[token_id],"memo":memo}]})));
    }

    /// The owner may sign a Bitcoin transaction digest. A first request burns transferability,
    /// even if its callback fails: a signature might have been produced before that failure.
    pub fn request_btc_signature(&mut self, token_id: String, payload_hex: String) -> Promise {
        let id = parse_id(&token_id);
        let mut gift = self.gifts.get(&id).cloned().expect("unknown gift");
        assert_eq!(env::predecessor_account_id(), gift.owner_id, "only the current owner can redeem");
        assert!(!gift.pending, "signature already pending");
        let payload = hex::decode(&payload_hex).expect("payload must be hex");
        assert_eq!(payload.len(), 32, "Bitcoin digest must be 32 bytes");
        assert!(payload.iter().any(|b| *b != 0), "zero digest is invalid");
        gift.pending = true;
        gift.redemption_started = true;
        gift.request_id += 1;
        gift.last_payload_hex = Some(payload_hex.clone());
        gift.last_signature = None;
        let request_id = gift.request_id;
        self.gifts.insert(id, gift);
        let args = serde_json::to_vec(&json!({"request": {
            "path": Self::btc_path(id), "payload_v2": {"Ecdsa": payload_hex}, "domain_id": 0
        }})).unwrap();
        Promise::new(MPC.parse().unwrap())
            .function_call("sign", args, NearToken::from_yoctonear(1), Gas::from_tgas(80))
            .then(Promise::new(env::current_account_id()).function_call(
                "on_btc_signature", serde_json::to_vec(&json!({"token_id":token_id,"request_id":request_id})).unwrap(),
                NearToken::from_yoctonear(0), Gas::from_tgas(30)))
    }

    #[private]
    pub fn on_btc_signature(&mut self, token_id: String, request_id: u64,
        #[callback_result] result: Result<serde_json::Value, PromiseError>) -> bool {
        let id = parse_id(&token_id);
        let mut gift = self.gifts.get(&id).cloned().expect("unknown gift");
        assert!(gift.pending && gift.request_id == request_id, "stale signature callback");
        gift.pending = false;
        match result {
            Ok(signature) if signature.get("scheme").and_then(|v| v.as_str()) == Some("Secp256k1")
                && signature.get("big_r").and_then(|v| v.get("affine_point")).and_then(|v| v.as_str()).is_some()
                && signature.get("s").and_then(|v| v.get("scalar")).and_then(|v| v.as_str()).is_some() => {
                gift.last_signature = Some(signature.to_string());
                env::log_str(&format!("EVENT_JSON:{}", json!({"standard":"prizekey","version":"1.0.0","event":"btc_signature_ready","data":{"token_id":token_id,"request_id":request_id,"payload_hex":gift.last_payload_hex}})));
                self.gifts.insert(id, gift);
                true
            }
            _ => {
                gift.last_payload_hex = None;
                self.gifts.insert(id, gift);
                env::log_str("btc_signature_failed");
                false
            }
        }
    }

    pub fn gift(&self, token_id: String) -> Option<Gift> { self.gifts.get(&parse_id(&token_id)).cloned() }
    pub fn btc_path(id: u64) -> String { format!("prizekey-btc-v1-{id}") }
    pub fn total_gifts(&self) -> u64 { self.next_id }
    pub fn gifts_for_owner(&self, owner_id: AccountId) -> Vec<Gift> {
        self.gifts.iter().filter_map(|(_, gift)| (gift.owner_id == owner_id).then_some(gift.clone())).collect()
    }
    pub fn nft_token(&self, token_id: String) -> Option<serde_json::Value> {
        self.gift(token_id.clone()).map(|gift| json!({
            "token_id": token_id, "owner_id": gift.owner_id, "approved_account_ids": {},
            "metadata": {"title": gift.title, "description": gift.message, "copies": 1}
        }))
    }
    pub fn nft_total_supply(&self) -> String { self.next_id.to_string() }
    pub fn nft_tokens(&self, from_index: Option<String>, limit: Option<u64>) -> Vec<serde_json::Value> {
        let from = from_index.as_deref().unwrap_or("0").parse::<u64>().expect("from_index");
        (from..self.next_id).take(limit.unwrap_or(50).min(100) as usize)
            .filter_map(|id| self.nft_token(id.to_string())).collect()
    }
    pub fn nft_supply_for_owner(&self, account_id: AccountId) -> String { self.gifts_for_owner(account_id).len().to_string() }
    pub fn nft_tokens_for_owner(&self, account_id: AccountId, from_index: Option<String>, limit: Option<u64>) -> Vec<serde_json::Value> {
        let from = from_index.as_deref().unwrap_or("0").parse::<usize>().expect("from_index");
        self.gifts_for_owner(account_id).into_iter().skip(from).take(limit.unwrap_or(50).min(100) as usize)
            .filter_map(|gift| self.nft_token(gift.id.to_string())).collect()
    }
    pub fn nft_metadata(&self) -> serde_json::Value {
        json!({"spec":"nft-1.0.0","name":"PrizeKey Bitcoin Gifts","symbol":"PKEY"})
    }
}

fn parse_id(token_id: &str) -> u64 {
    assert!(!token_id.is_empty() && token_id.bytes().all(|b| b.is_ascii_digit()), "invalid token_id");
    token_id.parse().expect("token_id overflow")
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn context(predecessor: &str, deposit: NearToken) {
        testing_env!(VMContextBuilder::new()
            .current_account_id("gift.testnet".parse().unwrap())
            .predecessor_account_id(predecessor.parse().unwrap())
            .attached_deposit(deposit)
            .build());
    }

    #[test]
    fn only_present_owner_can_redeem_and_transfer_locks_at_signature_request() {
        context("giver.testnet", MIN_CREATE_DEPOSIT);
        let mut contract = GiftContract::new();
        contract.create_gift("Birthday Bitcoin".into(), "Have fun".into());
        context("giver.testnet", NearToken::from_yoctonear(1));
        contract.nft_transfer("recipient.testnet".parse().unwrap(), "0".into(), None, None);
        assert_eq!(contract.nft_token("0".into()).unwrap()["owner_id"], "recipient.testnet");
        context("giver.testnet", NearToken::from_yoctonear(0));
        assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(||
            contract.request_btc_signature("0".into(), "01".repeat(32)))).is_err());
        context("recipient.testnet", NearToken::from_yoctonear(0));
        let _ = contract.request_btc_signature("0".into(), "01".repeat(32));
        assert!(contract.gift("0".into()).unwrap().pending);
        context("recipient.testnet", NearToken::from_yoctonear(1));
        assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(||
            contract.nft_transfer("thief.testnet".parse().unwrap(), "0".into(), None, None))).is_err());
    }

    #[test]
    fn failed_mpc_callback_keeps_transfer_frozen_but_allows_retry() {
        context("giver.testnet", MIN_CREATE_DEPOSIT);
        let mut contract = GiftContract::new();
        contract.create_gift("Gift".into(), "".into());
        context("giver.testnet", NearToken::from_yoctonear(0));
        let _ = contract.request_btc_signature("0".into(), "01".repeat(32));
        context("gift.testnet", NearToken::from_yoctonear(0));
        assert!(!contract.on_btc_signature("0".into(), 1, Err(PromiseError::Failed)));
        assert!(!contract.gift("0".into()).unwrap().pending);
        context("giver.testnet", NearToken::from_yoctonear(1));
        assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(||
            contract.nft_transfer("recipient.testnet".parse().unwrap(), "0".into(), None, None))).is_err());
        context("giver.testnet", NearToken::from_yoctonear(0));
        let _ = contract.request_btc_signature("0".into(), "02".repeat(32));
    }

    #[test]
    fn successful_signature_is_stored_and_transfer_stays_locked() {
        context("giver.testnet", MIN_CREATE_DEPOSIT);
        let mut contract = GiftContract::new();
        contract.create_gift("Bitcoin".into(), "".into());
        context("giver.testnet", NearToken::from_yoctonear(0));
        let _ = contract.request_btc_signature("0".into(), "03".repeat(32));
        context("gift.testnet", NearToken::from_yoctonear(0));
        let signature = json!({"scheme":"Secp256k1","big_r":{"affine_point":format!("02{}", "ab".repeat(32))},"s":{"scalar":"cd".repeat(32)},"recovery_id":1});
        assert!(contract.on_btc_signature("0".into(), 1, Ok(signature)));
        let gift = contract.gift("0".into()).unwrap();
        assert!(gift.redemption_started && !gift.pending);
        assert!(gift.last_signature.is_some());
        context("giver.testnet", NearToken::from_yoctonear(1));
        assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(||
            contract.nft_transfer("recipient.testnet".parse().unwrap(), "0".into(), None, None))).is_err());
    }
}
