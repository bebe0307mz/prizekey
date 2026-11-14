# PrizeKey — fund a prize, let the winner choose its destination

[Watch the 70-second portrait demo](public/demo.mp4) · [1920×1080 landscape copy](public/demo-1080p.mp4) · [Spoken subtitles](public/demo.srt) · [Matching narration](DEMO-SCRIPT.md).

The actual landing introduces the organizer’s problem and PrizeKey’s solution before the walkthrough. Its Create gift button opens the real form without submitting it. One completed gift carries the example: set Bitcoin aside before choosing the winner, transfer its NEAR claim, let that account choose a Bitcoin address, then inspect the delivered gift. The current app fills the mobile views. Original desktop transaction footage uses readable fixed crops and a small recorded-source label. The separate 100,000-sat unsigned preview has been removed from the video.

## Actual execution and current inspection

The recorded Gift #3 ran on14 November2026: create → fund20,000 test sats → transfer the NEAR claim → new holder authorizes → browser broadcasts19,750 native test sats, with a250-sat payout fee. Its payout was independently confirmed in Bitcoin testnet4 block161287. Confirmation is a dated public observation and can change after a testnet reorganization. Both networks use no-value test assets.

The original NEAR wallet required terminal signing. Bitcoin funding was prepared separately; the browser displayed its funded UTXO, then prepared and broadcast the holder’s payout. The video states this terminal-wallet limitation. It does not claim a new transaction, a terminal-free browser redemption, an independently executed old-owner rejection or mainnet support. Gift #1 remains separate and unspent.

The opening shows the current task-oriented landing; the ending shows the current gift-specific recipient page and current transaction details. Its public-record navigation, scrolling and loading were genuinely captured. Completed-record notices remain visible. Playing the video or opening these records makes no payment. The app’s admin upgrade key, destination/fee-policy and NFT interoperability limits remain in the README.

## Edit map

| Time | Screen and story |
| --- | --- |
| 0–7.6s | Actual landing: the organizer wants to set aside Bitcoin before knowing the winner or their Bitcoin address. |
| 7.6–17s | Same landing: explain funding a gift first, transferring its NEAR claim, and letting the winner choose the Bitcoin destination. Tap Create gift to open the real form; do not submit it. |
| 17–25s | Earlier test run: the same Gift #3 funded with 20,000 test sats and its Bitcoin address. |
| 25–33s | Enter the winner’s NEAR account, recorded transfer approval, and actual changed holder. |
| 33–40.8s | The holder chooses a Bitcoin address and approves the recorded payout. |
| 40.8–49s | NEAR Chain Signatures authorization and genuine browser broadcast. Terminal-wallet approval is disclosed. |
| 49–59s | Current recipient page: 19,750 test sats confirmed in block 161287, assigned recipient, completed-record notice and public-record tap. |
| 59–66.8s | Current transaction record: confirmed-status tap and two real short scrolls. |
| 66.8–70s | Closing reading hold on the same delivered gift. |

## Capture and validation

The 70-second copies contain H.264 video and AAC Zoe QUICK narration, synchronized ordinary captions, and complete voice takes without speed modification. The current mobile capture uses a real 393×780 responsive viewport; historical signed actions retain their actual desktop source. Fixed crops preserve recorded UI. Brief reading holds and genuine inactive-wait cuts are editorial edits, not simulated scrolling. The delivered gift at the end is an editorial return to an already inspected result.

The new opening captures average about 14–16 source frames/sec. The retained recipient captures average about 6/sec, and earlier transaction captures about 10/sec. The 30fps container repeats frames; some scrolls step abruptly. No native 30/60fps recording, fabricated intermediate UI or physical touchscreen capture is claimed. The main revision adds the requested landing explanation of the problem and solution, while preserving one-gift continuity, readable app views and action-linked narration.

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
