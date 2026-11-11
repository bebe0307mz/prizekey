# Public evidence

The public verifier is `pnpm verify:public`. For gift #0, it checks the current NEAR owner and redemption state, independently derives the gift Bitcoin address, recomputes the payout's SegWit sighash and matches it to the digest stored by the NEAR contract, compares the Bitcoin witness public key and signature components to the derived key and stored MPC signature, checks the 100,000 sat funding output was spent, and checks a confirmed 99,750 sat payout to the recipient address. For gift #1, it checks that the NEAR claim remains transferable and that the gift address has a 100,000 sat UTXO. It reports current confirmation state, which can change on testnet4. It does **not** prove the browser wallet flow.

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

Testnet4 payout confirmed at block 160513. The recipient address is `tb1qfmv0pfzuv0pu5fa570a8nrm7rs6jkpxkv0a6fj`. Both networks' assets here are valueless test assets.

`claim-local.json` and `poc-spend-local.json` are local transaction preparation files. They are excluded from Git because they contain operational records and are unnecessary to verify the public result.
