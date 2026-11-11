# PrizeKey demo: 90 seconds

**0–15s — Problem.** "A contest wants to announce a native Bitcoin prize today, but the winner has not supplied a Bitcoin address. How can the organizer fund it now and hand over control later?"

**15–35s — Product.** Open the app on gift #1, **A Bitcoin prize**. Show its 100,000 sat UTXO and current NEAR owner. The organizer funded the prize's native Bitcoin address before knowing the final Bitcoin destination. The claim remains transferable.

**35–65s — Real handoff.** Show one complete previous handoff using gift #0: the NEAR claim moved to a new account, that account requested the Chain Signatures signature, and the Bitcoin payout is confirmed. Open the transfer and Bitcoin payout links, then show the gift #0 owner and zero balance in the app. This is historical proof, not a fresh browser transaction.

**65–90s — Why NEAR.** The gift contract checks its current owner before requesting the Chain Signatures MPC signature; Bitcoin receives an ordinary native transaction. No bridge or wrapped token. End with `pnpm verify:public` reporting gift #0's completed payout and gift #1's still-funded UTXO.

For the final video, prefer a live action with a visible result: connect the organizer's NEAR testnet wallet, transfer a funded claim, and refresh to show its owner changed while the Bitcoin remains at the same native address. This has **not yet been recorded or verified in the browser**. If wallet connection is unavailable, show the CLI action and label it as such. A fresh redemption additionally needs a funded testnet4 UTXO and a recipient Bitcoin testnet4 address. Do not substitute a scripted claim for a wallet flow without labeling it.

## Evidence and claims

The first gift's complete handoff is verified on public test networks. The browser's wallet-connected create/transfer/redeem sequence still needs end-to-end UI verification. The testnet account currently has a privileged full-access key. State both limitations if asked; do not call the current deployment trustless or production safe.
