# PrizeKey

**Give native Bitcoin with a transferable claim on NEAR.** PrizeKey lets a giver create a gift, fund its unique Bitcoin address, and pass ownership to a recipient. The holder can request a Chain Signatures signature from a NEAR contract and sweep the Bitcoin to their own wallet. The Bitcoin never becomes a wrapped token, and no private key is shared with the recipient.

This is an independent **NEAR testnet + Bitcoin testnet4** hackathon prototype. Both test assets have no monetary value. The live contract is [`prizekey-v1-11b.testnet`](https://testnet.nearblocks.io/address/prizekey-v1-11b.testnet).

The deployed contract's current code hash is `5sgjA6E1Bodfj69XCegYa7yNHdHkgzj8DE3YNrWXyBkc` ([upgrade transaction](https://testnet.nearblocks.io/txns/DYtiRkTwohWWiWV1mZjtjwo26G1hzVxdpQnr2nL1s14K)); it matches the local release WASM built from this source.

**[Open the live demo](https://bebe0307mz.github.io/prizekey/)** · [Inspect the funded prize](https://bebe0307mz.github.io/prizekey/?gift=1#explore).

The focused use case is a **native Bitcoin prize**: an organizer funds the prize before the winner has supplied a Bitcoin address. When a winner is known, the organizer transfers the claim. The winner later chooses a testnet4 address and redeems. The same mechanism can handle personal gifts.

PrizeKey fits the hackathon's **NFTs That Do Something** track: ownership of the claim changes who can request a native Bitcoin signature. Chain Signatures is the NEAR-specific mechanism. The project implements direct NFT transfer and views, with the interoperability limits stated below.

## What works today

**Gift #3 is the complete recorded product run:** create a NEAR claim, fund its Bitcoin address with 20,000 testnet4 sats, transfer the claim to a second account, authorize as that holder, and broadcast 19,750 native testnet4 sats to the chosen destination. The payout was confirmed in block **161287** when checked on 14 November 2026. Confirmation is a dated observation; testnet reorganizations can change it.

[Watch the finished demo](public/demo.mp4) · [Read the shot map and narration](DEMO.md) · [Inspect every transaction](evidence/README.md) · [Saved verification result](evidence/gift3-verification.json).

```sh
pnpm verify:gift3
```

This read-only verifier checks final NEAR mint/transfer/signing actions and events, derives the gift address from the live MPC root public key, checks the Bitcoin input, destination, amount and fees, and matches the raw transaction's SegWit digest and witness to the NEAR-stored digest and MPC signature. It also checks that Gift #1 remains transferable with its 100,000-sat UTXO unspent. No signing credentials are needed. The original Gift #0 and Gift #2 handoffs remain separately reproducible with `pnpm verify:public`.

The UI reads live NEAR state and Bitcoin UTXOs. The recorded NEAR steps used the browser wallet's **NEAR CLI option**, which required terminal signing and pasting the resulting transaction hash. This is a browser-guided CLI signing flow. The browser prepared and broadcast the Bitcoin payout. The app supplies neither Bitcoin faucet funds nor a Bitcoin funding wallet.

The earlier holder's rejection after transfer has unit-test coverage. Gift #3's recording and verifier prove the successful new-holder path; no new old-holder rejection transaction was sent for this run.

## Why NEAR

NEAR [Chain Signatures](https://docs.near.org/chain-abstraction/chain-signatures/implementation) lets a contract request a Bitcoin secp256k1 signature for a gift-specific derived key. The NEAR contract checks the current gift owner before asking the MPC signer to sign. Bitcoin only sees a normal native Bitcoin transaction. A conventional NFT on a separate chain does not by itself control a Bitcoin UTXO; a custodial gift service would hold the signing key. PrizeKey connects transferable ownership and native Bitcoin spending in one contract-enforced handoff.

## Run locally

Requires Node.js 20+, pnpm, Rust toolchain with `wasm32-unknown-unknown` to build the contract.

```sh
pnpm install
pnpm dev
# open the localhost URL printed by Vite
```

Vite prints the actual port if 5175 is occupied. `pnpm build` builds the frontend. `cargo test -p prizekey-gift --lib` runs the contract unit tests; `cargo build --target wasm32-unknown-unknown --release -p prizekey-gift` builds its WASM. `pnpm verify:gift3` checks the recorded demo; `pnpm verify:public` checks historical handoffs. Both query public NEAR and Bitcoin testnet4 APIs with bounded timeouts and NEAR RPC fallback. No local wallet secrets are needed for read-only verification.

To create a fresh gift, connect a NEAR **testnet** wallet with at least 0.01 testnet NEAR, create the gift, fund the displayed Bitcoin **testnet4** address, then transfer the claim. The new holder can redeem one UTXO to a `tb1…` testnet4 address. The gift locks against transfer as soon as a signing request starts, including if the signing callback later fails. The CLI alternative is `DESTINATION_BTC=tb1... TOKEN_ID=1 pnpm claim prepare`, owner calling `request_btc_signature` with the displayed digest, then `pnpm claim broadcast`. CLI records are written under `evidence/*-local.json` and ignored by Git.

## Architecture and limits

- [`contracts/gift/src/lib.rs`](contracts/gift/src/lib.rs): owner-gated gift creation, direct transfer, MPC signing request, asynchronous callback, and gift views.
- [`src/App.jsx`](src/App.jsx): live testnet UI and browser-side Bitcoin transaction preparation, signing request, and broadcast.
- [`scripts/verify-public.mjs`](scripts/verify-public.mjs): repeatable checks for the two earlier handoffs and the still-funded prize. [`scripts/verify-gift3.mjs`](scripts/verify-gift3.mjs) verifies the recorded final demo from live public records. Public RPC verifies transaction content and state; screenshots document the browser actions.

This is a **direct-transfer NFT subset**, not full NEP-171: `nft_transfer_call` and approvals are absent. The contract does not parse or enforce the Bitcoin payout destination or fee: the holder authorizes a 32-byte digest, and the current browser prepares a one-input, one-output sweep with a fixed 250 sat fee. Anyone using the app should review the displayed destination and use only valueless test assets. A deployed full-access account key currently permits an account controller to replace the contract or bypass its policy; **do not treat this deployment as a trustless production vault**. We intend to remove that key only after the contract and demonstration are finalized. There is no automatic Bitcoin confirmation watcher or refund after redemption starts. Further funding after redemption can strand Bitcoin if the owner does not sign again. No mainnet or real-value flow has been tested.

## Hackathon demo

Watch the [finished narrated product demo](public/demo.mp4), or follow [DEMO.md](DEMO.md). It reuses the actual Gift #3 execution, trims genuine network/wallet waits, and ends on independently checked Bitcoin confirmation. It performs no new transaction during playback.

The published [GitHub Pages demo](https://bebe0307mz.github.io/prizekey/) reflects the last published revision; local final production changes require a separately authorized push and Pages build. Use the local setup above to inspect this revision.

## Contributors, dependencies and provenance

The repository is hosted under [`bebe0307mz`](https://github.com/bebe0307mz); authentic author and commit timestamps remain in Git history. Zoe is the PrizeKey contributor and narrator, and also contributes to Orbit. Narration uses her authorized QUICK voice model. Final submission contact and team fields require human confirmation.

Development is AI-assisted. Material dependencies are React, Vite, GSAP, Lucide, HOT Labs Near Connect, near-api-js, chainsig.js, bitcoinjs-lib, and Rust near-sdk; versions are pinned in the package/Cargo lockfiles. The NEAR MPC signer is external infrastructure. Video composition and caption timing use local FFmpeg, Pillow and Whisper; narration uses Zoe's existing authorized Fish Audio model. Raw voice samples, model IDs and signing credentials are excluded from the repository.

PrizeKey is independent of the other projects disclosed here: [Orbit](https://github.com/bebe0307mz/orbit) provides agent spending limits; AfterVote reconciles DAO payments; Capture Test examines Chain Signatures activity. PrizeKey has its own contract, app, evidence and repository and depends on none of those projects. This disclosure does not establish anyone's eligibility under the event's two-project-per-person limit; actual contribution and team membership must be checked.

License: MIT.

Presentation uses **GSAP 3.15.1** for brief transform/opacity animation, with reduced-motion support, under its [standard license](https://gsap.com/standard-license/). It does not determine chain state or payment outcomes.
