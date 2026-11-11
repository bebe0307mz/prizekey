use near_sdk::serde_json::{self, json, Value};
use near_sdk::{env, near, AccountId, Gas, NearToken, PanicOnDefault, Promise, PromiseError};

const MPC: &str = "v1.signer-prod.testnet";

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct GiftContract {
    owner: AccountId,
    pending: bool,
    signature: Option<String>,
}

#[near]
impl GiftContract {
    #[init]
    pub fn new(owner: AccountId) -> Self {
        Self { owner, pending: false, signature: None }
    }

    /// POC: prove an NEAR contract can control an independently derived secp256k1 key.
    pub fn sign_probe(&mut self, payload_hex: String) -> Promise {
        assert_eq!(env::predecessor_account_id(), self.owner, "owner only");
        assert!(!self.pending, "signature already pending");
        let payload = hex::decode(&payload_hex).expect("hex payload");
        assert_eq!(payload.len(), 32, "ECDSA payload must be 32 bytes");
        assert!(payload.iter().any(|b| *b != 0), "zero payload");
        self.pending = true;
        let args = serde_json::to_vec(&json!({
            "request": {"path": "probe-v1", "payload_v2": {"Ecdsa": payload_hex}, "domain_id": 0}
        })).unwrap();
        Promise::new(MPC.parse().unwrap())
            .function_call("sign", args, NearToken::from_yoctonear(1), Gas::from_tgas(80))
            .then(Promise::new(env::current_account_id()).function_call(
                "on_signed", b"{}".to_vec(), NearToken::from_yoctonear(0), Gas::from_tgas(30)))
    }

    #[private]
    pub fn on_signed(&mut self, #[callback_result] result: Result<Value, PromiseError>) -> bool {
        self.pending = false;
        match result {
            Ok(signature) => {
                let encoded = signature.to_string();
                env::log_str(&format!("signature_ready:{encoded}"));
                self.signature = Some(encoded);
                true
            }
            Err(_) => {
                env::log_str("signature_failed");
                false
            }
        }
    }

    pub fn probe_state(&self) -> (bool, Option<String>) {
        (self.pending, self.signature.clone())
    }
}
