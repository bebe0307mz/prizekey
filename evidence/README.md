# Public evidence

## Recorded Gift #3 — 14 November 2026

Run `pnpm verify:gift3` for a fresh read-only check. [The public manifest](gift3-proof.json) identifies all expected records; [the dated verification snapshot](gift3-verification.json) records the observed result. Gift #3 paid **19,750 testnet4 sats**, with a **250-sat payout fee**, from its **20,000-sat** funding output. The separate funding fee was also 250 sats. The payout was confirmed in block **161287** at the saved check; query again for current status. Gift #1 was verified still transferable and funded with 100,000 sats.

| Step | Public record |
| --- | --- |
| Create claim #3 | [NEAR mint](https://testnet.nearblocks.io/txns/Ba34Sf3JotwDxCw7JKkMB8FPKVWCYqJJY6yJZQYVMa4D) |
| Source authorizes funding | [NEAR MPC request](https://testnet.nearblocks.io/txns/4ZVcEe6yE3H4EMQbYHRHktvvkxUxjH7xEbBsw9auUcF4) |
| Fund 20,000 test sats | [Bitcoin funding](https://mempool.space/testnet4/tx/9bd1374bc9fff57643f75f717513db60ca0021b98fe23658f4305da6c6ebc6e4) |
| Transfer claim to new holder | [NEAR transfer](https://testnet.nearblocks.io/txns/4aJDiiWDpYtuCVv2i562sZANwKgz7ffjBrWoLo7Kw3UB) |
| Holder authorizes payout | [NEAR MPC request](https://testnet.nearblocks.io/txns/CxYuo541g6f34tGKvR2iScPps1T6L2gUCSxySMrpLQMA) |
| Deliver native Bitcoin | [Bitcoin payout](https://mempool.space/testnet4/tx/665a155eba10da7f8219cbc5077da5d63070be3e9b2e7da4dbbaf2e27b8ad931) |

The verifier links the final NEAR actions/events to a live-root-derived Bitcoin key, then checks the raw payout sighash, witness key and MPC signature. It separately verifies the funding signature and the preserved Gift #1 UTXO. These are historical transactions; running the verifier neither signs nor broadcasts. No live old-holder rejection transaction was sent for Gift #3; owner gating is covered by contract unit tests. Captured product footage documents the browser-guided CLI wallet workflow, while RPC verifies public execution.

The [current Gift #3 app proof](gift3-current-proof.png) and [public Bitcoin confirmation](gift3-bitcoin-confirmed.png) were captured during final production on 14 November.

## Earlier handoffs

The public verifier is `pnpm verify:public`. For gift #0, it checks the current NEAR owner and redemption state, independently derives the gift Bitcoin address, recomputes the payout's SegWit sighash and matches it to the digest stored by the NEAR contract, compares the Bitcoin witness public key and signature components to the derived key and stored MPC signature, checks the 100,000 sat funding output was spent, and checks a confirmed 99,750 sat payout to the recipient address. For gift #1, it checks that the NEAR claim remains transferable and that the gift address has a 100,000 sat UTXO. For gift #2, it checks final mint, transfer and signing actions, current owner, 20,000 sat funding, 19,750 sat native Bitcoin payout, and the same SegWit digest, derived-key and MPC-witness relationships. An independent CLI build produced gift #2's browser-broadcast transaction ID. Gift #2 confirmed in testnet4 block 160600 on 11 November. The verifier reports current Bitcoin confirmation state, which can change on testnet4. RPC verifies chain state and transactions; screenshots document the browser-guided interaction.

| Step | Public record |
| --- | --- |
| Contract deployed | [NEAR transaction](https://testnet.nearblocks.io/txns/342P2v9tTq4pEdPPDEzWCfQ499sQE3yL1PmEYqTCUeec) |
| Contract upgraded to canonical token IDs | [NEAR transaction](https://testnet.nearblocks.io/txns/DYtiRkTwohWWiWV1mZjtjwo26G1hzVxdpQnr2nL1s14K) |
| Gift #0 created | [NEAR transaction](https://testnet.nearblocks.io/txns/7mY4uwVVcaxA9rwy4GeTWMTDTbT1QHmKxVwBquHcWcH4) |
| 100,000 testnet4 sats funded | [Bitcoin transaction](https://mempool.space/testnet4/tx/383a3177c5c812b3b0bf79b53cddb47fc24a9365a2f74ba72df8c1c4a21cf1b1) |
| Gift transferred to recipient | [NEAR transaction](https://testnet.nearblocks.io/txns/9e9VnrkqdUUFmj1pnKzjNK911sm6j5m8rGWudEU6w51R) |
| Recipient requested BTC signature | [NEAR transaction](https://testnet.nearblocks.io/txns/CB874dcpxSy8t9xwgieuA5aPvzjmgQ23ZTvLHEjdVbNd) |
| Gift UTXO swept to recipient | [Bitcoin transaction](https://mempool.space/testnet4/tx/f255c70347b79eacbe48209d9b9c70b56e0455b2c11983698df758ddf67d96ff) |
| Second, transferable prize created | [NEAR transaction](https://testnet.nearblocks.io/txns/63rCZCzAaNch1hjjFqLgQRK2dQkqqmTok9JqDdTWzaXT) |
| Second prize funded with 100,000 testnet4 sats | [Bitcoin transaction](https://mempool.space/testnet4/tx/b201de6a6bf2605fe06a05e920267a7327ab46c4bed6d65c1529e41c1ea2feef) |
| Browser-guided gift #2 created | [NEAR transaction](https://testnet.nearblocks.io/txns/9FG1zzvcndTZS51w3J4UFWkUnVQnF1PSjRpwMS2ZDSE3) |
| Browser-guided gift #2 transferred | [NEAR transaction](https://testnet.nearblocks.io/txns/C2Km3c5KkduLeRfv7tS9Kt829kNYmBnxj92CMg66iu4N) |
| Gift #2 funded with 20,000 testnet4 sats | [Bitcoin transaction](https://mempool.space/testnet4/tx/94941c6f05f512afac3eea0f7e7b4fa6407c03b8170776d0426c19c198abff1d) |
| Browser-guided holder authorized Bitcoin signature | [NEAR transaction](https://testnet.nearblocks.io/txns/Ft1hmMjDpW6AuXmELEtohZUDX75YahN7crYDk3ppEkNg) |
| Browser broadcast native 19,750 sat payout | [Bitcoin transaction](https://mempool.space/testnet4/tx/58619632aa1e44ce6e28cb838d4015046894585b1ca3e0e2ff463bcf016a8550) |

Gift #0's testnet4 payout confirmed at block 160513. Gift #2's payout was broadcast; run `pnpm verify:public` for its current confirmation status. The destination addresses are `tb1qfmv0pfzuv0pu5fa570a8nrm7rs6jkpxkv0a6fj` and `tb1q40tm8unf8g7lcg4cmg47fhmhhyssnuqfqaesr5`. Both networks' assets here are valueless test assets.

`claim-local.json` and `poc-spend-local.json` are local transaction preparation files. They are excluded from Git because they contain operational records and are unnecessary to verify the public result.

## Demo screenshots

The [hero](demo-hero.png), [funded transferable prize](demo-funded-gift.png), [completed gift #0](demo-redeemed-gift.png), [public proof links](demo-proof.png), [gift #2 transfer](browser-create-transfer-2026-11-11.png), [funded gift #2 before redemption](browser-funded-before-redeem-2026-11-11.png), [browser broadcast action](browser-redeem-2026-11-11.png), and [gift #2 after payout](browser-redeem-result-2026-11-11.png) were captured from the local app on 11 November. They show public testnet state and the browser-guided transaction result; the verifier independently checks the chain evidence.
