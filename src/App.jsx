import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { NearConnector } from '@hot-labs/near-connect';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Bitcoin, Check, CircleHelp, Copy, ExternalLink, Gift, KeyRound, LockKeyhole, Menu, Send, ShieldCheck, Sparkles, Wallet, X } from 'lucide-react';

const CONTRACT = 'prizekey-v1-11b.testnet';
const NEAR_RPCS = ['https://rpc.testnet.near.org', 'https://test.rpc.fastnear.com'];
const RECORDED_GIFT = { id: 3, date: '14 November 2026', mint: 'Ba34Sf3JotwDxCw7JKkMB8FPKVWCYqJJY6yJZQYVMa4D', transfer: '4aJDiiWDpYtuCVv2i562sZANwKgz7ffjBrWoLo7Kw3UB', sign: 'CxYuo541g6f34tGKvR2iScPps1T6L2gUCSxySMrpLQMA', payout: '665a155eba10da7f8219cbc5077da5d63070be3e9b2e7da4dbbaf2e27b8ad931', destination: 'tb1q40tm8unf8g7lcg4cmg47fhmhhyssnuqfqaesr5' };
const BTC_API = 'https://mempool.space/testnet4/api';
const ONE_NEAR = 10n ** 24n;
const GAS = '150000000000000';
const connector = new NearConnector({ network: 'testnet', providers: { testnet: ['https://test.rpc.fastnear.com'] } });
let bitcoinClientPromise;
function getBitcoinClient() {
  bitcoinClientPromise ??= import('chainsig.js').then(({ contracts, chainAdapters }) => {
    const signer = new contracts.ChainSignatureContract({ networkId: 'testnet', contractId: 'v1.signer-prod.testnet' });
    return new chainAdapters.btc.Bitcoin({
      network: 'testnet', contract: signer,
      btcRpcAdapter: new chainAdapters.btc.BTCRpcAdapters.Mempool(BTC_API),
    });
  });
  return bitcoinClientPromise;
}

async function view(method, args = {}) {
  let lastError;
  for (const rpc of NEAR_RPCS) {
    try {
      const response = await fetch(rpc, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ jsonrpc: '2.0', id: 'prizekey', method: 'query', params: {
          request_type: 'call_function', finality: 'final', account_id: CONTRACT, method_name: method,
          args_base64: btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(args)))),
        } }),
      });
      if (!response.ok) throw new Error(`NEAR HTTP ${response.status}`);
      const body = await response.json();
      if (body.error) throw new Error(body.error.message || 'NEAR RPC failed');
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(body.result.result)));
    } catch (error) { lastError = error; }
  }
  throw new Error(`Public NEAR reads unavailable: ${lastError?.message || 'please retry'}`);
}

async function call(method, args, deposit = '0', gas = GAS) {
  const wallet = await connector.wallet();
  const result = await wallet.signAndSendTransaction({
    receiverId: CONTRACT,
    actions: [{ type: 'FunctionCall', params: { methodName: method, args, gas, deposit } }],
  });
  if (result.status?.Failure) throw new Error(JSON.stringify(result.status.Failure));
  return result;
}

const short = (value, left = 9, right = 6) => value && value.length > left + right + 3 ? `${value.slice(0, left)}…${value.slice(-right)}` : value;
const sats = (value) => new Intl.NumberFormat('en-US').format(value ?? 0);
const nearTx = (hash) => `https://testnet.nearblocks.io/txns/${hash}`;
const btcTx = (hash) => `https://mempool.space/testnet4/tx/${hash}`;
const claimStorageKey = (id) => `prizekey:claim:${CONTRACT}:${id}`;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForSignature(tokenId, payloadHex, previousRequestId) {
  for (let attempt = 0; attempt < 45; attempt++) {
    const gift = await view('gift', { token_id: tokenId });
    if (!gift.pending && gift.last_payload_hex === payloadHex && gift.last_signature) return gift;
    if (gift.request_id > previousRequestId && !gift.pending && gift.redemption_started && gift.last_payload_hex === null)
      throw new Error('NEAR signing failed. Your claim stays with you; retry authorization below.');
    await wait(1500);
  }
  throw new Error('NEAR signing is still pending. Refresh the gift later; your prepared payout is saved in this browser.');
}

function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  return <button className="copy-button" type="button" title={label} onClick={async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  }}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copied' : label}</button>;
}

function App() {
  const [account, setAccount] = useState('');
  const [walletLoading, setWalletLoading] = useState(true);
  const [gifts, setGifts] = useState([]);
  const [selectedId, setSelectedId] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('gift');
    return requested != null && /^\d+$/.test(requested) ? Number(requested) : 1;
  });
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [address, setAddress] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [balance, setBalance] = useState(null);
  const [recipient, setRecipient] = useState('');
  const [destination, setDestination] = useState('');
  const [title, setTitle] = useState('A little Bitcoin');
  const [message, setMessage] = useState('A gift that is yours to keep.');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [lastTx, setLastTx] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(() => window.location.hash === '#create');
  const [payout, setPayout] = useState(null);
  const [payoutError, setPayoutError] = useState('');
  const [readAt, setReadAt] = useState(null);
  const appRef = useRef(null);

  const selected = useMemo(() => gifts.find((g) => g.id === selectedId) ?? null, [gifts, selectedId]);
  const isOwner = !!selected && account === selected.owner_id;

  const refresh = useCallback(async (preferredId = null) => {
    const total = await view('total_gifts');
    const ids = Array.from({ length: Math.min(total, 24) }, (_, i) => total - 1 - i);
    const rows = await Promise.all(ids.map((id) => view('gift', { token_id: String(id) })));
    setGifts(rows.filter(Boolean));
    setReadAt(new Date());
    setSelectedId((current) => preferredId ?? current ??
      (rows.find((gift) => gift && !gift.redemption_started)?.id ?? rows[0]?.id ?? null));
    setRefreshNonce((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const signedIn = ({ accounts }) => { if (active) setAccount(accounts[0]?.accountId ?? ''); };
    const signedOut = () => { if (active) setAccount(''); };
    connector.on('wallet:signIn', signedIn);
    connector.on('wallet:signOut', signedOut);
    connector.getConnectedWallet().then((w) => { if (active) setAccount(w?.accounts[0]?.accountId ?? ''); })
      .catch(() => {}).finally(() => { if (active) setWalletLoading(false); });
    refresh().catch((e) => setError(e.message));
    return () => { active = false; connector.off('wallet:signIn', signedIn); connector.off('wallet:signOut', signedOut); };
  }, [refresh]);

  useEffect(() => {
    let active = true;
    setAddress(''); setPublicKey(''); setBalance(null);
    if (selectedId == null) return;
    getBitcoinClient().then((bitcoin) => bitcoin.deriveAddressAndPublicKey(CONTRACT, `prizekey-btc-v1-${selectedId}`)).then(async (derived) => {
      if (!active) return;
      setAddress(derived.address); setPublicKey(derived.publicKey);
      const response = await fetch(`${BTC_API}/address/${derived.address}/utxo`, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error(`Bitcoin HTTP ${response.status}`);
      const utxos = await response.json();
      if (active && Array.isArray(utxos)) setBalance(utxos.reduce((n, u) => n + u.value, 0));
    }).catch((e) => { if (active) setError(`Bitcoin address lookup: ${e.message}`); });
    return () => { active = false; };
  }, [selectedId, refreshNonce]);

  useEffect(() => {
    const context = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.from('.hero-copy > *, .gift-stage', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', clearProps: 'all' });
    }, appRef);
    return () => context.revert();
  }, []);

  useEffect(() => {
    let active = true;
    setPayout(null); setPayoutError('');
    fetch(`${BTC_API}/tx/${RECORDED_GIFT.payout}`, { signal: AbortSignal.timeout(12000) })
      .then(async (response) => { if (!response.ok) throw new Error(`Bitcoin HTTP ${response.status}`); return response.json(); })
      .then((tx) => {
        const output = tx.vout?.find((item) => item.scriptpubkey_address === RECORDED_GIFT.destination);
        if (!output || output.value !== 19750 || tx.fee !== 250 || tx.vin?.length !== 1 || tx.vin[0].txid !== '9bd1374bc9fff57643f75f717513db60ca0021b98fe23658f4305da6c6ebc6e4' || tx.vin[0].vout !== 0) throw new Error('Recorded payout output was not found.');
        if (active) setPayout({ amount: output.value, confirmed: tx.status?.confirmed === true, block: tx.status?.block_height, checkedAt: new Date() });
      }).catch((e) => { if (active) setPayoutError(e.message); });
    return () => { active = false; };
  }, [refreshNonce]);

  const run = async (label, fn) => {
    setBusy(label); setError(''); setNotice('');
    try { await fn(); } catch (e) { setError(e.message || String(e)); }
    finally { setBusy(''); }
  };

  const connect = () => run('Connecting wallet', async () => { await connector.connect(); });
  const createGift = (e) => { e.preventDefault(); run('Creating gift', async () => {
    if (!account) throw new Error('Connect a NEAR testnet wallet first');
    if (new TextEncoder().encode(title.trim()).length > 80 || new TextEncoder().encode(message.trim()).length > 240) throw new Error('Use a shorter title or note; the contract limits are 80 and 240 UTF-8 bytes.');
    const tx = await call('create_gift', { title: title.trim(), message: message.trim() }, (ONE_NEAR / 100n).toString(), '30000000000000');
    setLastTx({ label: 'Gift created on NEAR', hash: tx.transaction.hash });
    const mintedId = tx.receipts_outcome?.flatMap((receipt) => receipt.outcome.logs ?? []).filter((line) => line.startsWith('EVENT_JSON:')).map((line) => JSON.parse(line.slice(11))).find((event) => event.standard === 'nep171' && event.event === 'nft_mint')?.data?.[0]?.token_ids?.[0];
    const created = tx.status?.SuccessValue ? JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(tx.status.SuccessValue), c => c.charCodeAt(0)))) : mintedId != null ? await view('gift', { token_id: mintedId }) : null;
    if (!created || !Number.isSafeInteger(created.id) || created.owner_id !== account || created.title !== title.trim()) throw new Error('The new gift could not be matched to this creation. Check the transaction before continuing.');
    await refresh(created.id);
    history.replaceState(null, '', `?gift=${created.id}#desk-title`);
    setCreateOpen(false);
    document.getElementById('desk-title')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    setLastTx({ label: 'Gift created on NEAR', hash: tx.transaction.hash });
    setNotice('Your gift is live. Fund its Bitcoin testnet4 address, then transfer it.');
  }); };
  const transferGift = (e) => { e.preventDefault(); run('Transferring claim', async () => {
    if (!isOwner) throw new Error('Only the current owner can transfer this claim');
    const tx = await call('nft_transfer', { receiver_id: recipient.trim(), token_id: String(selected.id) }, '1', '30000000000000');
    await refresh(selected.id);
    setLastTx({ label: 'Gift transferred on NEAR', hash: tx.transaction.hash });
    setNotice(`The new holder is ${recipient.trim()}.`);
    setRecipient('');
  }); };

  const prepareClaim = (e) => { e.preventDefault(); run('Preparing Bitcoin payout', async () => {
    if (!isOwner) throw new Error('Only the current owner can redeem this gift');
    if (selected.pending) throw new Error('A Bitcoin signature is still pending');
    if (!/^tb1[ac-hj-np-z02-9]{20,90}$/.test(destination)) throw new Error('Enter a Bitcoin testnet4 SegWit address');
    if (!address || !publicKey) throw new Error('Bitcoin gift address is still loading');
    const bitcoin = await getBitcoinClient();
    const utxos = await (await fetch(`${BTC_API}/address/${address}/utxo`)).json();
    if (!Array.isArray(utxos) || utxos.length !== 1) throw new Error('This MVP redeems one Bitcoin UTXO per gift');
    const input = utxos[0];
    const parent = await (await fetch(`${BTC_API}/tx/${input.txid}`)).json();
    const fee = 250;
    if (input.value <= fee + 546) throw new Error('Gift balance is too small for a Bitcoin payout');
    const amount = input.value - fee;
    const { transaction, hashesToSign } = await bitcoin.prepareTransactionForSigning({
      publicKey,
      inputs: [{ txid: input.txid, vout: input.vout, value: input.value,
        scriptPubKey: Buffer.from(parent.vout[input.vout].scriptpubkey, 'hex') }],
      outputs: [{ address: destination, value: amount }],
    });
    if (hashesToSign.length !== 1) throw new Error('Expected exactly one Bitcoin signature');
    const payloadHex = Buffer.from(hashesToSign[0]).toString('hex');
    const record = { contract: CONTRACT, tokenId: String(selected.id), owner: account, source: address,
      destination, amount, fee, payloadHex, serialized: bitcoin.serializeTransaction(transaction) };
    localStorage.setItem(claimStorageKey(selected.id), JSON.stringify(record));
    const tx = await call('request_btc_signature', { token_id: String(selected.id), payload_hex: payloadHex }, '0', GAS);
    setLastTx({ label: 'Bitcoin signing request sent on NEAR', hash: tx.transaction.hash });
    try { await waitForSignature(String(selected.id), payloadHex, selected.request_id); }
    finally { await refresh(selected.id); }
    setLastTx({ label: 'Bitcoin signature authorized on NEAR', hash: tx.transaction.hash });
    setNotice('The NEAR contract signed your Bitcoin payout. Broadcast it below.');
  }); };

  const broadcastClaim = () => run('Broadcasting Bitcoin transaction', async () => {
    const raw = localStorage.getItem(claimStorageKey(selected.id));
    if (!raw) throw new Error('No prepared payout in this browser. Prepare a new digest with the same gift owner.');
    const record = JSON.parse(raw);
    const gift = await view('gift', { token_id: record.tokenId });
    if (gift.owner_id !== record.owner || gift.pending || gift.last_payload_hex !== record.payloadHex || !gift.last_signature)
      throw new Error('On-chain signature does not match the prepared Bitcoin payout');
    const sig = JSON.parse(gift.last_signature);
    const bitcoin = await getBitcoinClient();
    const rsv = { r: sig.big_r.affine_point.slice(2), s: sig.s.scalar, v: sig.recovery_id + 27 };
    const rawTx = bitcoin.finalizeTransactionSigning({
      transaction: bitcoin.deserializeTransaction(record.serialized), rsvSignatures: [rsv],
    });
    const result = await bitcoin.broadcastTx(rawTx);
    localStorage.setItem(`${claimStorageKey(selected.id)}:txid`, result.hash);
    setNotice(`Bitcoin payout broadcast: ${result.hash}`);
    setLastTx({ label: 'Native Bitcoin sent', hash: result.hash, bitcoin: true });
    setBalance(0);
  });

  const storedClaim = selected && localStorage.getItem(claimStorageKey(selected.id));
  const storedTxid = selected && localStorage.getItem(`${claimStorageKey(selected.id)}:txid`);
  const canBroadcast = !!storedClaim && !storedTxid && !!selected?.last_signature && !selected?.pending;
  const canAuthorize = isOwner && !selected?.pending;

  const showingPayout = selected?.id === RECORDED_GIFT.id;
  const knownPayout = showingPayout && payout;
  const selectedAmount = knownPayout ? payout.amount : balance;
  const cardState = knownPayout ? (payout.confirmed ? 'Payout confirmed' : 'Payout observed · unconfirmed') : selected?.redemption_started ? 'Redemption started' : balance > 0 ? 'Funded · ready to pass on' : balance === 0 ? 'Awaiting Bitcoin' : 'Reading public testnets';

  return <div className="app-shell" ref={appRef}>
    <header className="site-header">
      <a className="brand" href="#top" aria-label="PrizeKey home"><span className="brand-mark"><KeyRound size={22} strokeWidth={2.3} /></span><span>prizekey<span className="brand-dot">.</span></span></a>
      <nav className={menuOpen ? 'nav-links open' : 'nav-links'}><a href="#how" onClick={() => setMenuOpen(false)}>How it works</a><a href="#create" onClick={() => { setMenuOpen(false); setCreateOpen(true); }}>Make a gift</a><a href="#proof" onClick={() => setMenuOpen(false)}>Proof</a></nav>
      <div className="header-actions"><span className="network-pill">TESTNET · NO VALUE</span><button className="wallet-button" onClick={account ? () => connector.disconnect() : connect} disabled={walletLoading || !!busy}><Wallet size={16} />{walletLoading ? 'Checking…' : account ? short(account, 11, 7) : 'Connect wallet'}</button><button className="mobile-menu" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div>
    </header>

    <main id="top">
      <section className="hero wrap" id="explore">
        <div className="hero-copy"><div className="eyebrow">A BITCOIN PRIZE. A KEY TO PASS ON.</div><h1>Give Bitcoin.<br /><em>They choose<br />where it goes.</em></h1><p>Fund the prize now. Pass its NEAR claim to the winner. They redeem native Bitcoin.</p><div className="hero-cta"><button className="primary-button" data-testid="create-gift" onClick={() => { setCreateOpen(true); document.getElementById('create')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }}>Create a Bitcoin gift <ArrowRight size={18} /></button><button className="text-button" data-testid="redeemed-case" onClick={() => setSelectedId(RECORDED_GIFT.id)}>See a completed handoff <ArrowUpRight size={17} /></button></div><div className="hero-foot"><span className="source-dot"/> Live reads · Bitcoin + NEAR testnets · no monetary value</div></div>
        <div className="gift-stage" aria-live="polite" aria-label="Selected gift and public chain state">
          <div className="stage-glow" aria-hidden="true"/><span className="stage-spark" aria-hidden="true">✦</span>
          <div className="gift-card" data-testid="gift-card">
            <div className="card-top"><span className="card-wordmark"><KeyRound size={17}/> PRIZEKEY</span><span>#{selected ? String(selected.id).padStart(3,'0') : '—'}</span></div>
            <div className="card-art" aria-hidden="true"><span className="card-orbit orbit-a"/><span className="card-orbit orbit-b"/><span className="bitcoin-coin"><Bitcoin size={66} strokeWidth={1.5}/></span></div>
            <div className="card-value"><small>{knownPayout ? 'BITCOIN DELIVERED · RECORDED HANDOFF' : 'BITCOIN AT THIS GIFT'}</small><strong>{selectedAmount == null ? 'Reading…' : sats(selectedAmount)}<span>{selectedAmount == null ? '' : ' sats'}</span></strong><span className="card-state"><span/>{cardState}</span></div>
            <div className="card-owner"><span><small>NEAR CLAIM HOLDER</small><strong>{selected ? selected.owner_id : 'Reading the contract…'}</strong></span><KeyRound size={22}/></div>
          </div>
          <div className="gift-caption"><span><ShieldCheck size={16}/>{knownPayout ? `Existing payout · ${payout.confirmed ? `confirmed at block ${sats(payout.block)}` : 'confirmation pending'}` : selected?.redemption_started ? 'Claim transfers frozen after signing begins' : 'Transfer the claim. Keep the Bitcoin native.'}</span><span>{showingPayout ? `Case #${RECORDED_GIFT.id} · ${RECORDED_GIFT.date}` : selected ? `Live gift #${selected.id}` : 'Loading'}</span></div>
        </div>
      </section>

      <section className="journey wrap" id="how" aria-label="How PrizeKey works"><div><span className="journey-number">01</span><Gift size={23}/><span><strong>Fund a gift</strong><small>Bitcoin gets its own address</small></span></div><span className="journey-arrow">→</span><div><span className="journey-number">02</span><Send size={23}/><span><strong>Pass the claim</strong><small>Ownership moves on NEAR</small></span></div><span className="journey-arrow">→</span><div><span className="journey-number">03</span><Bitcoin size={23}/><span><strong>Winner redeems</strong><small>Native BTC, their destination</small></span></div></section>

      <section className="gift-desk wrap" aria-labelledby="desk-title">
        <div className="section-head"><div><span className="section-kicker">YOUR GIFT DESK</span><h2 id="desk-title">One claim. <em>One current holder.</em></h2></div><button className="quiet-button" onClick={() => run('Refreshing gifts', () => refresh())} disabled={!!busy}>Refresh live data <ArrowUpRight size={15}/></button></div>
        <div className="source-note">{readAt ? `NEAR state read ${readAt.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}. Bitcoin balance is a separate live UTXO read.` : 'Reading public NEAR testnet state…'} {showingPayout && 'The card shows an existing payout, not a new transaction.'}</div>
        <div className="gift-list" aria-label="Choose a gift">{gifts.map((gift) => <button type="button" data-gift-id={gift.id} aria-pressed={selectedId === gift.id} className={selectedId === gift.id ? 'gift-list-item selected' : 'gift-list-item'} key={gift.id} onClick={() => setSelectedId(gift.id)}><span className="gift-list-icon"><Gift size={19}/></span><span><strong>{gift.title}</strong><small>#{String(gift.id).padStart(3, '0')} · {gift.redemption_started ? 'Redemption started' : 'Transferable'}</small></span><ArrowUpRight size={17}/></button>)}</div>
        {selected && <div className="gift-details"><div className="gift-live-summary" aria-live="polite"><div><small>CURRENT GIFT BALANCE</small><strong>{balance == null ? 'Reading…' : `${sats(balance)} sats`}</strong></div><div><small>CURRENT CLAIM HOLDER</small><strong>{selected.owner_id}</strong></div></div><div className="detail-title"><span className="tiny-label">GIFT #{selected.id}</span><h3>{selected.title}</h3><p>{selected.message}</p></div><div className="address-box"><span>THIS GIFT’S BITCOIN ADDRESS</span><code>{address || 'Deriving address…'}</code><div>{address && <><CopyButton value={address} label="Copy"/><a href={`https://mempool.space/testnet4/address/${address}`} target="_blank" rel="noreferrer">Inspect Bitcoin balance <ExternalLink size={14}/></a></>}</div></div></div>}
        {gifts.length === 0 && <div className="empty-state">{error ? 'Public testnet reads are unavailable. No gift state has been inferred.' : 'Reading gifts from NEAR testnet…'}</div>}
        {selected && <details className="manage-details" id="manage"><summary><span><KeyRound size={18}/> Transfer or redeem this gift</span><small>{isOwner ? 'You are the current holder' : 'Connect the current holder’s wallet to act'} <ArrowDownRight size={16}/></small></summary><div className="action-grid"><form className="action-card" onSubmit={transferGift}><h3>Pass the claim</h3><p>The next NEAR holder gets permission to request the Bitcoin signature.</p><label>Recipient NEAR account<input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="winner.testnet" required disabled={!isOwner || selected.redemption_started}/></label><button className="primary-button" type="submit" disabled={!isOwner || selected.redemption_started || !!busy}>Transfer claim <ArrowRight size={16}/></button><small className="action-warning">Prototype: an admin upgrade key remains.</small></form><form className="action-card" onSubmit={prepareClaim}><h3>Redeem native Bitcoin</h3><p>Signing freezes transfers. A replacement signature does not invalidate a previously signed payout.</p><label>Your Bitcoin testnet4 address<input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="tb1q…" disabled={!canAuthorize}/></label><button className="primary-button" type="submit" disabled={!canAuthorize || !!busy || !balance}>{selected.last_signature ? 'Replace authorization' : selected.redemption_started ? 'Retry authorization' : 'Authorize payout'} <ArrowRight size={16}/></button>{canBroadcast && <button className="secondary-button" type="button" onClick={broadcastClaim} disabled={!!busy}>Broadcast prepared Bitcoin payout <ExternalLink size={16}/></button>}{storedTxid && <a className="proof-link" href={btcTx(storedTxid)} target="_blank" rel="noreferrer">Your Bitcoin transaction <ExternalLink size={14}/></a>}<small className="action-warning">Destination and fee policy are not fully enforced on chain. Test assets only.</small></form></div></details>}
      </section>

      <section className="proof-section wrap" id="proof"><div className="section-head"><div><span className="section-kicker">THE HANDOFF, ON THE RECORD</span><h2>From gift to <em>their Bitcoin.</em></h2></div><span className="proof-date">Recorded case #{RECORDED_GIFT.id} · {RECORDED_GIFT.date}</span></div><div className="proof-journey"><a href={nearTx(RECORDED_GIFT.mint)} target="_blank" rel="noreferrer"><span className="proof-step">01</span><Gift size={24}/><strong>Gift created</strong><small>NEAR claim #{RECORDED_GIFT.id} <ExternalLink size={12}/></small></a><a href={nearTx(RECORDED_GIFT.transfer)} target="_blank" rel="noreferrer"><span className="proof-step">02</span><Send size={24}/><strong>Claim passed on</strong><small>New NEAR holder <ExternalLink size={12}/></small></a><a href={nearTx(RECORDED_GIFT.sign)} target="_blank" rel="noreferrer"><span className="proof-step">03</span><KeyRound size={24}/><strong>Holder authorized</strong><small>NEAR Chain Signatures <ExternalLink size={12}/></small></a><a className="proof-payout" data-testid="payout-proof" href={btcTx(RECORDED_GIFT.payout)} target="_blank" rel="noreferrer"><span className="proof-step">04</span><Bitcoin size={24}/><strong>{payout ? `${sats(payout.amount)} sats sent` : 'Inspect Bitcoin payout'}</strong><small>{payout ? payout.confirmed ? 'Confirmed on Bitcoin testnet4' : 'Observed · not confirmed' : payoutError ? 'Live recheck unavailable' : 'Reading public transaction…'} <ExternalLink size={12}/></small></a></div><p className="proof-note">These are historical transactions, not actions performed on this page. The winner authorized through the browser’s NEAR CLI option; signing required a terminal. The browser prepared and broadcast the Bitcoin payout.</p></section>

      <section className="create-section wrap" id="create"><details className="create-details" open={createOpen} onToggle={(e) => setCreateOpen(e.currentTarget.open)}><summary><span><Gift size={22}/><strong>Make your own gift</strong></span><span>0.01 testnet NEAR storage <ArrowDownRight size={18}/></span></summary><form className="form-card" onSubmit={createGift}><label>Gift title<input maxLength="80" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A little Bitcoin" required /></label><label>A note for the winner<textarea maxLength="240" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Say something memorable…" rows="2" /></label><button className="primary-button" disabled={!!busy || !account} type="submit">{busy === 'Creating gift' ? 'Creating…' : account ? 'Create gift' : 'Connect a wallet to create'} <ArrowRight size={18}/></button><p className="action-warning">Create the NEAR claim, fund its Bitcoin testnet4 address, then pass it on. All assets have no value.</p></form></details><details className="limits"><summary>Prototype limits & trust</summary><p>NEAR testnet and Bitcoin testnet4 only. The contract checks the current holder before requesting a Chain Signatures MPC signature; it still has an admin upgrade key. The deployed contract does not bind every Bitcoin destination or fee detail. Direct transfer works; full NEP-171 interoperability is incomplete. Redemption supports one UTXO per gift. Beginning redemption freezes claim transfers, and an earlier signed payout may still broadcast after reauthorization.</p></details></section>
    </main>
    <footer className="site-footer wrap"><a className="brand" href="#top"><KeyRound size={20}/><span>prizekey.</span></a><span>Built at NEAR Hackathon 2026 · Test assets only</span><a href="https://github.com/bebe0307mz/prizekey" target="_blank" rel="noreferrer">Source <ArrowUpRight size={15}/></a></footer>
    {(notice || error || lastTx) && <div className={error ? 'toast error' : 'toast'} role="status"><button aria-label="Dismiss" onClick={() => { setNotice(''); setError(''); setLastTx(null); }}><X size={16}/></button><strong>{error ? 'Something needs attention' : busy || 'On-chain update'}</strong><p>{error || notice}</p>{lastTx && <a href={lastTx.bitcoin ? btcTx(lastTx.hash) : nearTx(lastTx.hash)} target="_blank" rel="noreferrer">{lastTx.label} <ExternalLink size={14}/></a>}</div>}
  </div>;
}

export default App;
