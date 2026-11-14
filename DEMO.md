# PrizeKey — fund a prize, let the winner choose its destination

[Watch the 60-second portrait demo](public/demo.mp4) · [1920×1080 landscape copy](public/demo-1080p.mp4) · [Spoken subtitles](public/demo.srt) · [Matching narration](DEMO-SCRIPT.md).

One gift carries the story: set Bitcoin aside before choosing the winner, transfer its NEAR claim, let that account choose a Bitcoin address, then inspect the delivered gift. The current app fills the mobile views. Original desktop transaction footage uses readable fixed crops and a small recorded-source label. The separate 100,000-sat unsigned preview has been removed from the video.

## Actual execution and current inspection

The recorded Gift #3 ran on14 November2026: create → fund20,000 test sats → transfer the NEAR claim → new holder authorizes → browser broadcasts19,750 native test sats, with a250-sat payout fee. Its payout was independently confirmed in Bitcoin testnet4 block161287. Confirmation is a dated public observation and can change after a testnet reorganization. Both networks use no-value test assets.

The original NEAR wallet required terminal signing. Bitcoin funding was prepared separately; the browser displayed its funded UTXO, then prepared and broadcast the holder’s payout. The video states this terminal-wallet limitation. It does not claim a new transaction, a terminal-free browser redemption, an independently executed old-owner rejection or mainnet support. Gift #1 remains separate and unspent.

The opening and ending show the current gift-specific recipient page and current transaction details. Its public-record navigation, scrolling and loading were genuinely captured. Completed-record notices remain visible. Playing the video or opening these records makes no payment. The app’s admin upgrade key, destination/fee-policy and NFT interoperability limits remain in the README.

## Edit map

| Time | Screen and story |
| --- | --- |
| 0–7s | Current Gift #3 recipient page introduces the completed gift and the giveaway problem. Real scrolling reveals the recipient. |
| 7–15s | Earlier test run: read the same gift’s 20,000-sat funding and its Bitcoin address. |
| 15–23s | Enter the winner’s NEAR account, approve the recorded transfer, then show the actual new holder. |
| 23–30.8s | The holder enters a Bitcoin destination and approves the recorded payout. |
| 30.8–39s | NEAR Chain Signatures authorization and genuine browser broadcast. Terminal-wallet approval is disclosed. |
| 39–49s | The current recipient page shows 19,750 test sats confirmed in block161287, the assigned recipient and the completed-record notice. Tap its public record. |
| 49–56.8s | Current loaded transaction record: confirmed-status tap and two genuine short scrolls. |
| 56.8–60s | Editorial return to the same delivered gift for the closing reading hold. |

## Capture and validation

Both copies contain H.264 video and AAC Zoe QUICK narration, synchronized ordinary captions, and complete voice takes without speed modification. The current mobile capture uses a real 393×780 responsive viewport; historical signed actions retain their actual desktop source. Fixed crops preserve recorded UI. Brief reading holds and genuine inactive-wait cuts are editorial edits, not simulated scrolling. The delivered gift at the end is an editorial return to an already inspected result.

The available screenshot stream averages about 6 source frames/sec on current phone takes and about 10/sec on the earlier desktop recordings. The 30fps container repeats frames; some scrolls step abruptly. No native 30/60fps recording, fabricated intermediate UI or physical touchscreen capture is claimed. The main revision addresses story continuity and readability, using Orbit’s actual 72-second cut as a reference for large app views and action-linked explanation.

Checks include both complete-file decodes, encoded frame inspection, caption bounds/overlap checks, full narration-duration checks and ASR word timing. Product and contract checks are documented in the README; this edit changes media and documentation only.

## Public and local access

[App](https://bebe0307mz.github.io/prizekey/) · [Recipient record](https://bebe0307mz.github.io/prizekey/?claim=3) · [Portrait video](https://bebe0307mz.github.io/prizekey/demo.mp4) · [Landscape video](https://bebe0307mz.github.io/prizekey/demo-1080p.mp4) · [Public evidence](evidence/README.md).

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test:recipient
pnpm test:contract
pnpm verify:gift3
pnpm verify:public
pnpm exec vite --host 127.0.0.1 --port 4175 --strictPort
```

For local inspection, open `http://127.0.0.1:4175/?claim=3` or `?gift=3#transactions`. Read-only navigation creates, transfers, authorizes and broadcasts nothing. Never repeat the completed Gift #3 run. New signed operations require their own bounded authorization. Source/app/demo publication is authorized; X posting and hackathon submission are separate actions.
