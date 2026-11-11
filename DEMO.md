# PrizeKey demo: 90 seconds

**0–15s — Problem.** "Giving Bitcoin usually means sending it immediately, sharing a key, or trusting a custodian. What if the gift itself could be passed along before anyone spends it?"

**15–35s — Product.** Open the app. Show the live gift list and gift #0. Explain that the claim's owner is a NEAR account while the funds sit at a native Bitcoin testnet4 address. The app derives that address from the PrizeKey contract and gift ID.

**35–65s — Real handoff.** Follow the proof links in order: NEAR mint, Bitcoin funding, NEAR transfer to a new account, new holder's signing request, confirmed Bitcoin payout. Show the NEAR owner and Bitcoin UTXO balance in the live app. Explain that the contract rejected the old owner and froze transfer once redemption began.

**65–90s — Why NEAR.** The NEAR contract enforces who can request the Chain Signatures MPC signature; Bitcoin receives an ordinary native transaction. No bridge or wrapped token. End with `pnpm verify:public` reporting the same holder, funding output, spent input, destination, and confirmed payout.

Optional live interaction: connect a NEAR testnet wallet, create a new gift, and copy its derived Bitcoin testnet4 address. A fully live redemption needs a funded testnet4 UTXO and a recipient Bitcoin testnet4 address. Do not substitute a scripted claim for a wallet flow without labeling it.

## Evidence and claims

The first gift's complete handoff is verified on public test networks. The browser's wallet-connected create/transfer/redeem sequence still needs end-to-end UI verification. The testnet account currently has a privileged full-access key. State both limitations if asked; do not call the current deployment trustless or production safe.
