# A Bitcoin gift, in 33 seconds

[Watch the actual app](public/demo.mp4). The clip uses actual testnet reads, historical proof links, captions and narration generated from a provided team voice model. It does not create or redeem a new gift.

## Reproduce the moment

After the repository setup, start the preview:

```sh
pnpm exec vite --host 127.0.0.1 --port 4175 --strictPort
```

Open `http://127.0.0.1:4175/?gift=1#top`.

1. **See a funded prize** (`[data-testid="funded-case"]`) selects gift #1. Its Bitcoin address currently has **100,000 test sats**, and the card identifies its current NEAR holder. This balance is a separate live UTXO read, not a fiat valuation.
2. **See a completed handoff** (`[data-testid="redeemed-case"]`) selects the existing gift #2 case. Its card shows the **19,750-sat** recipient output from an already confirmed Bitcoin testnet4 transaction, block **160600**.
3. Open **Proof** (`#proof`) to follow four real historical transactions: gift creation, NEAR claim transfer, holder authorization and Bitcoin payout. This case occurred on **11 November 2026**. It is not a newly completed transfer.
4. The existing create, transfer and redeem tools remain available in disclosures. The recorded case used the browser's NEAR CLI option, which required terminal signing; it is not described as a wallet-only browser flow.

Exact payout: [586196…a8550](https://mempool.space/testnet4/tx/58619632aa1e44ce6e28cb838d4015046894585b1ca3e0e2ff463bcf016a8550). All assets are on Bitcoin testnet4 and NEAR testnet and have no monetary value.

## Production and validation

Actual browser footage was sampled about 10 times per second and encoded at 30 fps; captions and voice were added. No slides or fabricated success screens. [Desktop](evidence/bright-desktop.jpg) and [phone](evidence/bright-phone.jpg) were checked without horizontal overflow.

Production build passed. A fresh Bitcoin read confirmed the exact historical recipient output. The full public verifier encountered an archival NEAR RPC **HTTP 408** during this update, so it is not reported as passing. Current state and BTC reads do not independently reverify all historical NEAR transactions. The original recorded proof remains available in the evidence directory.

No contract, signing policy, wallet permission or key was changed. The administrator upgrade key and incomplete on-chain destination/fee binding remain material prototype limits; read the README before attempting any action. No transaction, publication or deployment was performed for this presentation update.
