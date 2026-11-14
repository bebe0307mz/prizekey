# PrizeKey — fund a prize, let the winner choose its destination

[Watch the 70-second portrait demo (1.1×)](public/demo.mp4) · [1920×1080 landscape copy](public/demo-1080p.mp4) · [Spoken subtitles](public/demo.srt) · [Matching narration](DEMO-SCRIPT.md).

The actual landing introduces the organizer’s problem and PrizeKey’s solution before the walkthrough. Its Create gift button opens the real form without submitting it. One completed gift carries the example: set Bitcoin aside before choosing the winner, transfer its NEAR claim, let that account choose a Bitcoin address, then inspect the delivered gift. The current app fills the mobile views. Original desktop transaction footage uses readable fixed crops and a small recorded-source label. The separate 100,000-sat unsigned preview has been removed from the video.

## Actual execution and current inspection

The recorded Gift #3 ran on14 November2026: create → fund20,000 test sats → transfer the NEAR claim → new holder authorizes → browser broadcasts19,750 native test sats, with a250-sat payout fee. Its payout was independently confirmed in Bitcoin testnet4 block161287. Confirmation is a dated public observation and can change after a testnet reorganization. Both networks use no-value test assets.

The original NEAR wallet required terminal signing. Bitcoin funding was prepared separately; the browser displayed its funded UTXO, then prepared and broadcast the holder’s payout. The wallet mode remains documented here; it is not a spoken aside in the video. It does not claim a new transaction, a terminal-free browser redemption, an independently executed old-owner rejection or mainnet support. Gift #1 remains separate and unspent.

The opening shows the current task-oriented landing; the ending shows the current gift-specific recipient page and current transaction details. Its public-record navigation, scrolling and loading were genuinely captured. Completed-record notices remain visible. Playing the video or opening these records makes no payment. The app’s admin upgrade key, destination/fee-policy and NFT interoperability limits remain in the README.

## Edit map

| Final time | Screen and story |
| --- | --- |
| 0–7s | Actual landing: giveaway problem before the winner or their Bitcoin address is known. |
| 7–15.5s | PrizeKey’s solution, followed by the real Create gift action without submission. |
| 15.5–22.7s | Earlier Gift #3 funded with 20,000 test sats and its Bitcoin address. |
| 22.7–30s | Recorded winner account entry, claim transfer and changed holder. |
| 30–37.1s | The holder chooses a Bitcoin destination and approves the recorded payout. |
| 37.1–44.5s | Chain Signatures authorization and browser broadcast, with time to inspect the returned transaction. |
| 44.5–53.6s | Current recipient: 19,750 test sats confirmed and public-record tap. |
| 53.6–58.9s | Current transaction details and public Bitcoin confirmation. |
| 58.9–70s | Actual return to the landing: NEAR tracks ownership; Chain Signatures enables the holder’s Bitcoin payout. |

## Capture and validation

The 70-second copies contain H.264 video and AAC Zoe QUICK narration, synchronized ordinary captions, and complete retained utterances, then a full 1.1× speed increase with pitch-preserving audio tempo adjustment. Caption times follow the same speed change. The current mobile capture uses a real 393×780 responsive viewport; historical signed actions retain their actual desktop source. Fixed crops preserve recorded UI. Brief reading holds and genuine inactive-wait cuts are editorial edits, not simulated scrolling. The ending uses actual footer-brand navigation and a native Home key to return from the public record to the landing. The full edit intentionally runs at 1.1×; source motion is accelerated rather than presented as native realtime.

The new opening captures average about 14–16 source frames/sec. The retained recipient captures average about 6/sec, and earlier transaction captures about 10/sec. The 30fps container repeats frames; some scrolls step abruptly. No native 30/60fps recording, fabricated intermediate UI or physical touchscreen capture is claimed. The opening now uses shorter, more upbeat phrasing. Captions are raised above the controls and adjusted around key app content. The ending returns to the landing and explains how NEAR tracks the claim’s owner and how Chain Signatures enables a native Bitcoin payout.

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
