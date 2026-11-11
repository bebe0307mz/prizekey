# PrizeKey

**Give native Bitcoin with a transferable claim on NEAR.** PrizeKey lets a giver create a gift, fund its unique Bitcoin address, and pass ownership to a recipient. The holder can request a Chain Signatures signature from a NEAR contract and sweep the Bitcoin to their own wallet. The Bitcoin never becomes a wrapped token, and no private key is shared with the recipient.

This is an independent **NEAR testnet + Bitcoin testnet4** hackathon prototype. Both test assets have no monetary value. The live contract is [`prizekey-v1-11b.testnet`](https://testnet.nearblocks.io/address/prizekey-v1-11b.testnet).

The deployed contract's current code hash is `5sgjA6E1Bodfj69XCegYa7yNHdHkgzj8DE3YNrWXyBkc` ([upgrade transaction](https://testnet.nearblocks.io/txns/DYtiRkTwohWWiWV1mZjtjwo26G1hzVxdpQnr2nL1s14K)); it matches the local release WASM built from this source.

**[Open the live demo](https://bebe0307mz.github.io/prizekey/).**

The focused use case is a **native Bitcoin prize**: an organizer funds the prize before the winner has supplied a Bitcoin address. When a winner is known, the organizer transfers the claim. The winner later chooses a testnet4 address and redeems. The same mechanism can handle personal gifts.

## What works today

The first gift was created, funded with 100,000 testnet4 sats, transferred to a second NEAR account, and redeemed by that new holder for 99,750 sats (250 sat fee). The Bitcoin payout is confirmed. The original holder's attempt to request a signature after transfer was rejected by the contract. Run `pnpm verify:public` for an independent read of the public NEAR state and Bitcoin transactions. The [proof links](evidence/README.md) show each step.

A second gift, **A Bitcoin prize**, is currently funded with a 100,000 sat testnet4 UTXO and remains transferable. It gives the public app a live unredeemed claim to inspect. Testnet4 confirmation status can change after a reorganization; the verifier reports the current status.

The browser app reads live contract state and Bitcoin UTXOs. It offers wallet-connected creation, direct transfer, and a one-UTXO redemption flow. The on-chain demonstration was executed from the CLI; **we have not yet verified a full wallet-connected browser redemption**. The app does not provide Bitcoin testnet4 faucet funds or a Bitcoin wallet.

## Why NEAR

NEAR [Chain Signatures](https://docs.near.org/chain-abstraction/chain-signatures/implementation) lets a contract request a Bitcoin secp256k1 signature for a gift-specific derived key. The NEAR contract checks the current gift owner before asking the MPC signer to sign. Bitcoin only sees a normal native Bitcoin transaction. A conventional NFT on a separate chain does not by itself control a Bitcoin UTXO; a custodial gift service would hold the signing key. PrizeKey connects transferable ownership and native Bitcoin spending in one contract-enforced handoff.

## Run locally

Requires Node.js 20+, pnpm, Rust toolchain with `wasm32-unknown-unknown` to build the contract.

```sh
pnpm install
pnpm dev
# open the localhost URL printed by Vite
```

Vite prints the actual port if 5175 is occupied. `pnpm build` builds the frontend. `cargo test -p prizekey-gift --lib` runs the contract unit tests; `cargo build --target wasm32-unknown-unknown --release -p prizekey-gift` builds its WASM. `pnpm verify:public` queries public NEAR and Bitcoin testnet4 APIs. No local wallet secrets are needed for read-only verification.

To create a fresh gift, connect a NEAR **testnet** wallet with at least 0.01 testnet NEAR, create the gift, fund the displayed Bitcoin **testnet4** address, then transfer the claim. The new holder can redeem one UTXO to a `tb1…` testnet4 address. The gift locks against transfer as soon as a signing request starts, including if the signing callback later fails. The CLI alternative is `DESTINATION_BTC=tb1... TOKEN_ID=1 pnpm claim prepare`, owner calling `request_btc_signature` with the displayed digest, then `pnpm claim broadcast`. CLI records are written under `evidence/*-local.json` and ignored by Git.

## Architecture and limits

- [`contracts/gift/src/lib.rs`](contracts/gift/src/lib.rs): owner-gated gift creation, direct transfer, MPC signing request, asynchronous callback, and gift views.
- [`src/App.jsx`](src/App.jsx): live testnet UI and browser-side Bitcoin transaction preparation, signing request, and broadcast.
- [`scripts/verify-public.mjs`](scripts/verify-public.mjs): repeatable public-chain check for the first gift.

This is a **direct-transfer NFT subset**, not full NEP-171: `nft_transfer_call` and approvals are absent. The contract does not parse or enforce the Bitcoin payout destination or fee: the holder authorizes a 32-byte digest, and the current browser prepares a one-input, one-output sweep with a fixed 250 sat fee. Anyone using the app should review the displayed destination and use only valueless test assets. A deployed full-access account key currently permits an account controller to replace the contract or bypass its policy; **do not treat this deployment as a trustless production vault**. We intend to remove that key only after the contract and demonstration are finalized. There is no automatic Bitcoin confirmation watcher or refund after redemption starts. Further funding after redemption can strand Bitcoin if the owner does not sign again. No mainnet or real-value flow has been tested.

## Hackathon demo

See [DEMO.md](DEMO.md) for a 90-second walkthrough. PrizeKey is separate from [Orbit](https://github.com/bebe0307mz/orbit) and has its own contract, app, repository, and submission story.

License: MIT.
