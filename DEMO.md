# PrizeKey — product walkthrough

[Watch the 84-second portrait walkthrough](public/demo.mp4) · [1920×1080 landscape copy](public/demo-1080p.mp4) · [Spoken subtitles](public/demo.srt) · [Narration and edit map](DEMO-SCRIPT.md).

The updated cut follows the actual current responsive app: funded gift → recipient page → address entry → unsigned amount/fee review → earlier recorded claim transfer/redemption → current confirmed payout details. Actual app use dominates; historical signing is explicitly labeled as recorded prior-interface execution. Zoe QUICK narration uses her existing authorized model. Both copies are H.264/AAC with ordinary burned-in captions and matching SRT/VTT files.

## What was actually performed

The current phone preview uses the separate Gift #1, which still holds 100,000 test sats. It prepares an unsigned 99,750-sat payout with a 250-sat fee for review. **Approve in my wallet was never clicked.** Gift #1 remains untouched.

The completed example is Gift #3. Its real workflow ran on 14 November 2026: create → fund 20,000 test sats → transfer the NEAR claim → new holder authorizes → browser broadcasts 19,750 native test sats. The public payout was independently confirmed in Bitcoin testnet4 block 161287. Both networks use valueless test assets. Opening the completed gift or playing the video makes no payment. Confirmation status can change after a testnet reorganization.

The recorded NEAR wallet used its CLI option and required terminal signing. Bitcoin funding was prepared separately; the browser displayed the resulting funded UTXO, then prepared and broadcast the holder’s payout. No fresh browser-wallet signing, old-owner rejection transaction, or mainnet flow is claimed. The prototype retains an admin upgrade key and destination/fee-policy and interoperability limits described in the README.

## Capture quality and provenance

Mobile source takes use the actual responsive application at 393×780, with genuine supported browser scrolling, clicks, field input and public-read loading. Continuous screenshot streams retain source timestamps and intermediate frames where captured. Fixed crops remove unused capture surface; no animated pan of a screenshot, synthetic gesture, or fabricated success state is used. Genuine inactive waits are trimmed, and actual result views receive short reading holds.

The available browser capture averages about **6 source frames per second**, despite the 30 fps encoded container. Some native scrolls step abruptly; encoding does not restore missing movement. A faster capture trial also observed immediate native-scroll steps. This is a reviewable current-product cut, not a claimed smooth 30/60 fps touchscreen recording. Portrait is intended for the recipient flow; the landscape copy gives the original desktop transaction evidence more readable space.

## Shot-by-shot edit map

| Seconds | Actual workflow |
| --- | --- |
| 0–21.32 | Current phone gift manager: funded Gift #1, assigned account, real scrolling, tap Open recipient page, genuine public-read loading. |
| 21.32–38.68 | Current recipient: paste a Bitcoin test address, prepare an unsigned payout, inspect 99,750 test sats and a 250-sat fee; stop before approval. |
| 38.68–50.68 | Earlier approved Gift #3 desktop recording: 20,000 test sats, winner account entry, transfer approval, changed holder at the same gift address. |
| 50.68–63.08 | Earlier recorded holder authorization and browser Bitcoin broadcast. The terminal-wallet approval requirement remains explicit. |
| 63.08–71.58 | Current phone recipient for completed Gift #3: 19,750 test sats, block 161287, assigned recipient, completed-record notice, public-record tap. |
| 71.58–84 | Current loaded transaction details: actual confirmed-status tap, short scrolls through NEAR transactions and confirmed Bitcoin payout. |

## Read-only reproduction

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test:recipient
pnpm test:contract
pnpm verify:gift3
pnpm verify:public
pnpm exec vite --host 127.0.0.1 --port 4175 --strictPort
```

Open `http://127.0.0.1:4175/?gift=3#top` for the completed gift and transaction details, or `?claim=3` for its recipient page. Open `?gift=1#top` to inspect the separate still-funded gift. Read-only inspection creates, transfers, authorizes and broadcasts nothing. Obtain a new explicitly bounded authorization before any new signed operation; never repeat the completed Gift #3 run.

Public verification inputs and dated outputs are under [evidence](evidence/README.md). Local final changes require a separately authorized push before they appear on GitHub Pages. No X post or submission is created by this repository.
