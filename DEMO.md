# PrizeKey — fund Bitcoin now, choose the recipient later

[Watch the finished 63-second demo](public/demo.mp4). 1920×1080, H.264/AAC, 30 fps. Zoe QUICK narration uses her existing authorized model. [Subtitles](public/demo.srt) are ordinary spoken captions and are also burned into the video.

## What the recording proves

The real Gift #3 workflow ran on 14 November 2026: create → fund 20,000 test sats → transfer the NEAR claim → current holder authorizes → browser broadcasts 19,750 native test sats. The public payout was confirmed in Bitcoin testnet4 block 161287 at verification. Both assets are valueless test assets. Genuine wallet/network waits are trimmed, and selected actual result frames are held for readability. No new transaction runs during playback. A fresh public explorer read closes the story; confirmation status can change after a testnet reorganization.

The NEAR steps used the browser wallet’s CLI option and required terminal signing. The Bitcoin funding transaction was prepared separately; the browser showed its resulting funded UTXO. The browser prepared and broadcast the holder’s Bitcoin payout. This prototype retains an admin upgrade key and the policy/interoperability limits described in the README. No live old-owner rejection transaction was sent for Gift #3.

## Shot-by-shot edit map

Simple cuts and short dissolves connect the shots. Actual screens appear inside a consistent frame; focused crops enlarge complete balance/holder cards and the Bitcoin receipt, while captions sit below them. Screens are actual captures, never reconstructed success states. The first twelve seconds introduce the problem and solution; the remainder shows product execution and its public result.

| Seconds | Purpose | Actual visual |
| --- | --- | --- |
| 00.00–08.00 | THE PROBLEM | Original problem slide; prize funding precedes winner/address. |
| 08.00–12.50 | THE IDEA | Three-step solution slide. |
| 12.50–16.00 | 01 / CREATE | Create from the recorded Gift #3 workflow. |
| 16.00–17.40 | 01 / CREATE | Created from the recorded Gift #3 workflow. |
| 17.40–20.60 | 02 / FUND | Fund Address from the recorded Gift #3 workflow. |
| 20.60–23.30 | 02 / FUND | Enlarged actual card: 20,000 sats, original holder and Gift #3 address. |
| 23.30–27.45 | 03 / TRANSFER | Transfer from the recorded Gift #3 workflow. |
| 27.45–30.40 | 03 / TRANSFER | Enlarged actual card: 20,000 sats, new CURRENT CLAIM HOLDER, same Gift #3 address before redemption. |
| 30.40–34.40 | 04 / AUTHORIZE | Authorize from the recorded Gift #3 workflow. |
| 34.40–36.50 | 04 / AUTHORIZE | Signature Ready from the recorded Gift #3 workflow. |
| 36.50–41.30 | 05 / BROADCAST | Broadcast from the recorded Gift #3 workflow. |
| 41.30–43.80 | 05 / BROADCAST | Broadcast from the recorded Gift #3 workflow. |
| 43.80–52.80 | 06 / VERIFIED RESULT | Actual mempool.space payout page: confirmation, 250-sat fee, native input/output. |
| 52.80–57.10 | THE COMPLETE HANDOFF | Actual current app proof links and holder/balance. |
| 57.10–63.00 | PRIZEKEY | Original value statement. |

## Final narration

I'm Zoe. Prize organizers may need to fund Bitcoin before they know the winner, or the winner's Bitcoin address.

PrizeKey lets you fund Bitcoin now, and choose the recipient later.

In this recorded testnet run, I create a gift. It gets its own Bitcoin address and a transferable claim on NEAR.

The gift is funded with twenty thousand test sats. I enter the winner's NEAR account and transfer the claim.

Ownership has changed. The new holder chooses a Bitcoin destination and authorizes the payout through NEAR Chain Signatures.

The browser broadcasts the signed Bitcoin transaction. No wrapped token, and no private key passed to the winner.

The public Bitcoin record confirms nineteen thousand seven hundred fifty test sats delivered, with a two hundred fifty sat fee.

This is a testnet prototype with an admin upgrade key. Fund first, pass the claim, and let the holder choose where Bitcoin goes.

## Read-only reproduction

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test:contract
pnpm verify:gift3
pnpm verify:public
pnpm exec vite --host 127.0.0.1 --port 4175 --strictPort
```

Open `http://127.0.0.1:4175/?gift=3#desk-title` to inspect the current recipient and zero remaining gift balance, then the proof section. Open `?gift=1#top` to inspect the separate, still-funded 100,000-sat transferable claim. These views do not create, transfer, authorize or broadcast. To repeat transactions, obtain a new explicitly bounded authorization; the completed Gift #3 run must not be repeated.

Public verification inputs and dated outputs are under [evidence](evidence/README.md). Final local changes and video require a separately approved push before they appear on GitHub Pages. No X post or submission is created by this repository.
