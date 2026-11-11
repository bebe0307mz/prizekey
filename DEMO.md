# PrizeKey demo: 90 seconds

**0–15s — Problem.** "A contest wants to announce a native Bitcoin prize today, but the winner has not supplied a Bitcoin address. How can the organizer fund it now and hand over control later?"

**15–35s — Product.** Open the app on gift #1, **A Bitcoin prize**. Show its 100,000 sat UTXO and current NEAR owner. The organizer funded the prize's native Bitcoin address before knowing the final Bitcoin destination. The claim remains transferable.

**35–65s — Real handoff.** Show one complete previous handoff using gift #0: the NEAR claim moved to a new account, that account requested the Chain Signatures signature, and the Bitcoin payout is confirmed. Open the transfer and Bitcoin payout links, then show the gift #0 owner and zero balance in the app. This is historical proof, not a fresh browser transaction.

**65–90s — Why NEAR.** The gift contract checks its current owner before requesting the Chain Signatures MPC signature; Bitcoin receives an ordinary native transaction. No bridge or wrapped token. End with `pnpm verify:public` reporting gift #0's completed payout and gift #1's still-funded UTXO.

The NEAR CLI wallet option was exercised in the browser with gift #2: create and direct transfer both completed on NEAR testnet and appeared in the UI. It prompts for a terminal command and transaction hash, so label it a **browser-guided CLI signing flow**. Gift #2 is unfunded. For the final video, show the funded gift #1 and gift #0's historical payout, then the gift #2 screenshot and exact two transaction links. A fresh browser redemption still needs a funded testnet4 UTXO and a recipient Bitcoin testnet4 address; it remains unverified.

## Evidence and claims

The first gift's complete handoff is verified on public test networks. Browser-guided create and transfer of gift #2 are also verified by final NEAR transactions. Browser redemption remains unverified. The testnet account currently has a privileged full-access key. State both limitations if asked; do not call the current deployment trustless or production safe.
