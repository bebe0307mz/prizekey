# Public evidence

The public verifier is `pnpm verify:public`. It checks the current NEAR gift owner and redemption state, independently derives the gift Bitcoin address, checks that a 100,000 sat funding output to that address was spent, and checks a confirmed 99,750 sat payout to the recipient address. It does **not** independently replay the Bitcoin signature digest or prove the browser wallet flow.

| Step | Public record |
| --- | --- |
| Contract deployed | [NEAR transaction](https://testnet.nearblocks.io/txns/342P2v9tTq4pEdPPDEzWCfQ499sQE3yL1PmEYqTCUeec) |
| Gift #0 created | [NEAR transaction](https://testnet.nearblocks.io/txns/7mY4uwVVcaxA9rwy4GeTWMTDTbT1QHmKxVwBquHcWcH4) |
| 100,000 testnet4 sats funded | [Bitcoin transaction](https://mempool.space/testnet4/tx/383a3177c5c812b3b0bf79b53cddb47fc24a9365a2f74ba72df8c1c4a21cf1b1) |
| Gift transferred to recipient | [NEAR transaction](https://testnet.nearblocks.io/txns/9e9VnrkqdUUFmj1pnKzjNK911sm6j5m8rGWudEU6w51R) |
| Recipient requested BTC signature | [NEAR transaction](https://testnet.nearblocks.io/txns/CB874dcpxSy8t9xwgieuA5aPvzjmgQ23ZTvLHEjdVbNd) |
| Gift UTXO swept to recipient | [Bitcoin transaction](https://mempool.space/testnet4/tx/f255c70347b79eacbe48209d9b9c70b56e0455b2c11983698df758ddf67d96ff) |

Testnet4 payout confirmed at block 160513. The recipient address is `tb1qfmv0pfzuv0pu5fa570a8nrm7rs6jkpxkv0a6fj`. Both networks' assets here are valueless test assets.

`claim-local.json` and `poc-spend-local.json` are local transaction preparation files. They are excluded from Git because they contain operational records and are unnecessary to verify the public result.
