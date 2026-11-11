# PrizeKey demo: 90 seconds

**0–15s — Problem.** "A contest wants to announce a native Bitcoin prize today, but the winner has not supplied a Bitcoin address. How can the organizer fund it now and hand over control later?"

**15–35s — Product.** Open the app on gift #1, **A Bitcoin prize**. Show its 100,000 sat UTXO and current NEAR owner. The organizer funded the prize's native Bitcoin address before knowing the final Bitcoin destination. The claim remains transferable.

**35–70s — Browser-guided handoff.** Show gift #2's recorded sequence: created in the browser, transferred to a second NEAR account, then funded with 20,000 testnet4 sats, authorized by that holder with Chain Signatures, and paid out as a native 19,750 sat Bitcoin transaction. Gift #1 separately demonstrates funding before the winner is known. Show the [before](evidence/browser-funded-before-redeem-2026-11-11.png) and [after](evidence/browser-redeem-result-2026-11-11.png) screenshots and the exact transaction links. The NEAR CLI wallet option required terminal commands and hash verification; the browser prepared and broadcast the Bitcoin payout.

**70–90s — Why NEAR.** The gift contract checks its current owner before requesting the Chain Signatures MPC signature; Bitcoin receives an ordinary native transaction. No bridge or wrapped token. End with `pnpm verify:public` reporting two Bitcoin payouts and gift #1's still-funded UTXO.

Gift #2's payout was built in the browser and independently reconstructed by the CLI with the same Bitcoin transaction ID. The NEAR authorization used the browser's NEAR CLI option. Label the signing step accurately; the wallet was connected to the UI but transaction signing occurred in the terminal. The payout was broadcast on testnet4; its confirmation may lag or change after a reorganization.

## Evidence and claims

Two gift handoffs are verified on public test networks. Gift #2 includes browser-guided create, transfer, authorization and browser Bitcoin broadcast. The testnet account currently has a privileged full-access key. Do not call the current deployment trustless or production safe.
