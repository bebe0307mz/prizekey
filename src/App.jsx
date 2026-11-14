import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import ClaimPage from './ClaimPage.jsx';
import { parseGiftRoute, recipientLink, loadGiftRows, readPreparedClaim } from './claim-state.mjs';
import { NearConnector } from '@hot-labs/near-connect';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Bitcoin, Check, CircleHelp, Copy, ExternalLink, Gift, KeyRound, LockKeyhole, Menu, Send, ShieldCheck, Sparkles, Wallet, X } from 'lucide-react';

const CONTRACT = 'prizekey-v1-11b.testnet';
const NEAR_RPCS = ['https://archival-rpc.testnet.near.org', 'https://rpc.testnet.near.org', 'https://test.rpc.fastnear.com'];
const pendingReads = new Map();
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

async function readView(method, args = {}) {
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

function view(method, args = {}) {
  const key = JSON.stringify([method, args]);
  if (!pendingReads.has(key)) pendingReads.set(key, readView(method, args).finally(() => pendingReads.delete(key)));
  return pendingReads.get(key);
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
  const route = useMemo(() => parseGiftRoute(window.location.search), []);
  const [account, setAccount] = useState('');
  const [walletInfo, setWalletInfo] = useState(null);
  const [reviewRecord, setReviewRecord] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [gifts, setGifts] = useState([]);
  const [selectedId, setSelectedId] = useState(route.id);
  const selectedIdRef = useRef(route.id);
  const refreshRequest = useRef(0);
  selectedIdRef.current = selectedId;
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
  const [transactionsOpen, setTransactionsOpen] = useState(() => ['#transactions', '#proof'].includes(window.location.hash));
  const [payout, setPayout] = useState(null);
  const [payoutError, setPayoutError] = useState('');
  const [readAt, setReadAt] = useState(null);
  const appRef = useRef(null);

  const selected = useMemo(() => gifts.find((g) => g.id === selectedId) ?? null, [gifts, selectedId]);
  const isOwner = !!selected && account === selected.owner_id;

  const refresh = useCallback(async (preferredId = null) => {
    const request = ++refreshRequest.current;
    let rows;
    try { rows = await loadGiftRows(view, route, preferredId ?? selectedIdRef.current); }
    catch (error) { if (request === refreshRequest.current) throw error; return; }
    if (request !== refreshRequest.current) return;
    setError('');
    setGifts(rows.filter(Boolean));
    setReadAt(new Date());
    setSelectedId((current) => preferredId ?? current ??
      (rows.find((gift) => gift && !gift.redemption_started)?.id ?? rows[0]?.id ?? null));
    setRefreshNonce((current) => current + 1);
  }, [route]);

  useEffect(() => {
    let active = true;
    const signedIn = ({ accounts, wallet }) => { if (active) { setAccount(accounts[0]?.accountId ?? ''); setWalletInfo(wallet?.manifest ?? null); } };
    const signedOut = () => { if (active) { setAccount(''); setWalletInfo(null); } };
    connector.on('wallet:signIn', signedIn);
    connector.on('wallet:signOut', signedOut);
    connector.getConnectedWallet().then((w) => { if (active) { setAccount(w?.accounts[0]?.accountId ?? ''); setWalletInfo(w?.wallet.manifest ?? null); } })
      .catch(() => {}).finally(() => { if (active) setWalletLoading(false); });
    refresh().catch((e) => setError(e.message));
    return () => { active = false; connector.off('wallet:signIn', signedIn); connector.off('wallet:signOut', signedOut); };
  }, [refresh]);

  useEffect(() => {
    let active = true;
    setAddress(''); setPublicKey(''); setBalance(null);
    if (selectedId == null || !selected) return;
    getBitcoinClient().then((bitcoin) => bitcoin.deriveAddressAndPublicKey(CONTRACT, `prizekey-btc-v1-${selectedId}`)).then(async (derived) => {
      if (!active) return;
      setAddress(derived.address); setPublicKey(derived.publicKey);
      const response = await fetch(`${BTC_API}/address/${derived.address}/utxo`, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error(`Bitcoin HTTP ${response.status}`);
      const utxos = await response.json();
      if (active && Array.isArray(utxos)) setBalance(utxos.reduce((n, u) => n + u.value, 0));
    }).catch((e) => { if (active) setError(`Bitcoin address lookup: ${e.message}`); });
    return () => { active = false; };
  }, [selectedId, refreshNonce, !!selected]);

  useEffect(() => { setReviewRecord(null); }, [selectedId, account, destination]);

  useEffect(() => {
    if (route.claim) return;
    const context = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.from('.section-head', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', clearProps: 'all' });
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
    try { await fn(); } catch (e) { if (label === 'Connecting wallet' && /reject|cancel|closed/i.test(e.message ?? '')) setNotice('Wallet selection closed.'); else setError(e.message || String(e)); }
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
    const liveGift = await view('gift', { token_id: String(selected.id) });
    if (liveGift?.owner_id !== account || liveGift.pending) throw new Error('The gift holder or approval status changed. Refresh before continuing.');
    const utxoResponse = await fetch(`${BTC_API}/address/${address}/utxo`, { signal: AbortSignal.timeout(12000) });
    if (!utxoResponse.ok) throw new Error('The Bitcoin balance could not be checked. Please retry.');
    const utxos = await utxoResponse.json();
    if (!Array.isArray(utxos) || utxos.length !== 1) throw new Error('This MVP redeems one Bitcoin UTXO per gift');
    const input = utxos[0];
    const parentResponse = await fetch(`${BTC_API}/tx/${input.txid}`, { signal: AbortSignal.timeout(12000) });
    if (!parentResponse.ok) throw new Error('The funding transaction could not be checked. Please retry.');
    const parent = await parentResponse.json();
    if (parent.vout?.[input.vout]?.scriptpubkey_address !== address || parent.vout[input.vout].value !== input.value) throw new Error('Funding output does not match this gift. Refresh before continuing.');
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
    record.input = { txid: input.txid, vout: input.vout, value: input.value };
    setReviewRecord(record);
  }); };

  const authorizeReviewed = () => run('Approving Bitcoin payout', async () => {
    const record = reviewRecord;
    if (!record || record.contract !== CONTRACT || record.tokenId !== String(selected?.id) || record.owner !== account || record.destination !== destination) throw new Error('Review this payout again before approving.');
    const gift = await view('gift', { token_id: record.tokenId });
    if (gift.owner_id !== account || gift.pending) throw new Error('Only the current holder can approve this gift. Refresh and review again.');
    const response = await fetch(`${BTC_API}/address/${record.source}/utxo`, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('Could not recheck the gift balance. Please retry.');
    const currentInputs = await response.json();
    if (currentInputs.length !== 1 || currentInputs[0].txid !== record.input.txid || currentInputs[0].vout !== record.input.vout || currentInputs[0].value !== record.input.value) throw new Error('The gift balance changed. Review the payout again.');
    localStorage.setItem(claimStorageKey(selected.id), JSON.stringify(record));
    const tx = await call('request_btc_signature', { token_id: record.tokenId, payload_hex: record.payloadHex }, '0', GAS);
    setLastTx({ label: 'Bitcoin signing request sent on NEAR', hash: tx.transaction.hash });
    try { await waitForSignature(record.tokenId, record.payloadHex, gift.request_id); }
    finally { await refresh(selected.id); }
    setReviewRecord(null);
    setLastTx({ label: 'Bitcoin signature authorized on NEAR', hash: tx.transaction.hash });
    setNotice('Your payout is ready. Send it to Bitcoin to finish.');
  });

  const broadcastClaim = () => run('Broadcasting Bitcoin transaction', async () => {
    const raw = localStorage.getItem(claimStorageKey(selected.id));
    if (!raw) throw new Error('No prepared payout in this browser. Prepare a new digest with the same gift owner.');
    const record = readPreparedClaim(raw, CONTRACT, selected, account);
    if (!record) throw new Error('The prepared payout belongs to a different gift or holder.');
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

  const storedClaim = selected && readPreparedClaim(localStorage.getItem(claimStorageKey(selected.id)), CONTRACT, selected, account);
  const storedTxid = selected && localStorage.getItem(`${claimStorageKey(selected.id)}:txid`);
  const canBroadcast = !!storedClaim && !storedTxid && selected?.last_payload_hex === storedClaim.payloadHex && !!selected?.last_signature && !selected?.pending;
  const canAuthorize = isOwner && !selected?.pending;
  const recipientUrl = selected && recipientLink(window.location.href, selected.id);

  const showingPayout = selected?.id === RECORDED_GIFT.id;
  const knownPayout = showingPayout && payout;


  const [claimPayout, setClaimPayout] = useState(null);
  const [claimPayoutError, setClaimPayoutError] = useState('');
  useEffect(() => {
    let active = true;
    setClaimPayout(null); setClaimPayoutError('');
    if (!route.claim || !address || !/^[0-9a-f]{64}$/.test(storedTxid ?? '') || showingPayout) return;
    fetch(`${BTC_API}/tx/${storedTxid}`, { signal: AbortSignal.timeout(12000) })
      .then(async (response) => { if (!response.ok) throw new Error('The payout is not visible in the public Bitcoin API yet. Check again shortly.'); return response.json(); })
      .then((tx) => {
        if (tx.txid !== storedTxid || tx.vin?.length !== 1 || tx.vin[0].prevout?.scriptpubkey_address !== address || tx.vout?.length !== 1 || tx.fee !== 250 || tx.vin[0].prevout.value - tx.vout[0].value !== tx.fee) throw new Error('The recorded transaction could not be matched to this gift.');
        if (active) setClaimPayout({ amount: tx.vout[0].value, txid: tx.txid, confirmed: tx.status?.confirmed === true, block: tx.status?.block_height });
      }).catch((error) => { if (active) setClaimPayoutError(error.message); });
    return () => { active = false; };
  }, [route.claim, address, storedTxid, showingPayout, refreshNonce]);

  const chooseGift = (id) => { setSelectedId(id); setReviewRecord(null); history.replaceState(null, '', `?gift=${id}`); };

  if (route.claim) return <ClaimPage gift={selected} giftId={route.id} account={account} walletName={walletInfo?.name} walletId={walletInfo?.id} loading={!readAt && !error} error={error} balance={balance} payout={knownPayout ? { ...payout, txid: RECORDED_GIFT.payout, recorded: true } : claimPayout} payoutError={showingPayout ? payoutError : claimPayoutError} destination={destination} setDestination={setDestination} connect={connect} disconnect={() => run('Disconnecting wallet', () => connector.disconnect())} refresh={() => run('Checking gift', () => refresh())} busy={busy} prepare={prepareClaim} review={reviewRecord} authorize={authorizeReviewed} canBroadcast={canBroadcast} broadcast={broadcastClaim} storedTxid={storedTxid} local={['localhost','127.0.0.1','[::1]'].includes(window.location.hostname)} notice={notice}/>;

  return <div className="app-shell" ref={appRef}>
    <header className="site-header">
      <a className="brand" href="#top" aria-label="PrizeKey home"><span className="brand-mark"><KeyRound size={22} strokeWidth={2.3} /></span><span>prizekey<span className="brand-dot">.</span></span></a>
      <nav className={menuOpen ? 'nav-links open' : 'nav-links'}><a href="#gifts" onClick={() => setMenuOpen(false)}>Gifts</a><a href="#create" onClick={() => { setMenuOpen(false); setCreateOpen(true); }}>Create gift</a><a href="#transactions" onClick={() => { setMenuOpen(false); setTransactionsOpen(true); }}>Transaction details</a></nav>
      <div className="header-actions"><span className="network-pill">TESTNET · NO VALUE</span><button className="wallet-button" onClick={account ? () => connector.disconnect() : connect} disabled={walletLoading || !!busy}><Wallet size={16} />{walletLoading ? 'Checking…' : account ? short(account, 11, 7) : 'Connect wallet'}</button><button className="mobile-menu" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div>
    </header>

    <main id="top">
      <section className="gift-desk wrap" id="gifts" aria-labelledby="desk-title">
        <div className="section-head"><div><h1 id="desk-title">Bitcoin gifts</h1><p className="desk-description">Create a gift, fund its address, and assign it to a NEAR account.</p><span className="desk-network">NEAR testnet · Bitcoin testnet4 · No monetary value</span></div><div className="desk-actions"><button className="primary-button" data-testid="create-gift" onClick={() => { setCreateOpen(true); document.getElementById('create')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }}>Create gift <Gift size={17}/></button><button className="quiet-button" onClick={() => run('Refreshing gifts', () => refresh())} disabled={!!busy}>Refresh <ArrowUpRight size={15}/></button></div></div>
        <div className="source-note">{readAt ? `NEAR state read ${readAt.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}. Bitcoin balance is a separate live UTXO read.` : 'Reading public NEAR testnet state…'} {showingPayout && 'Recorded payout is available in Transaction details.'}</div>
        <label className="mobile-gift-picker" htmlFor="gift-selector">Gift<select id="gift-selector" data-testid="gift-picker" value={selected ? selectedId : ''} onChange={(e) => { if (e.target.value !== '') chooseGift(Number(e.target.value)); }} disabled={!gifts.length}><option value="">{gifts.length ? 'Choose a gift' : 'Loading gifts…'}</option>{gifts.map((gift) => <option key={gift.id} value={gift.id}>#{gift.id} · {gift.title}</option>)}</select></label>
        <div className="gift-list" aria-label="Choose a gift">{gifts.map((gift) => <button type="button" data-gift-id={gift.id} aria-pressed={selectedId === gift.id} className={selectedId === gift.id ? 'gift-list-item selected' : 'gift-list-item'} key={gift.id} onClick={() => chooseGift(gift.id)}><span className="gift-list-icon"><Gift size={19}/></span><span><strong>{gift.title}</strong><small>#{String(gift.id).padStart(3, '0')} · {gift.redemption_started ? 'Redemption started' : 'Transferable'}</small></span><ArrowUpRight size={17}/></button>)}</div>
        {selected && <div className="gift-details"><div className="gift-live-summary" key={selected.owner_id} aria-live="polite"><div><small>CURRENT GIFT BALANCE</small><strong>{balance == null ? 'Reading…' : `${sats(balance)} sats`}</strong></div><div><small>CURRENT CLAIM HOLDER</small><strong>{selected.owner_id}</strong></div></div><div className="detail-title"><span className="tiny-label">GIFT #{selected.id}</span><h3>{selected.title}</h3><p>{selected.message}</p></div><div className="address-box"><span>THIS GIFT’S BITCOIN ADDRESS</span><code>{address || 'Deriving address…'}</code><div>{address && <><CopyButton value={address} label="Copy"/><a href={`https://mempool.space/testnet4/address/${address}`} target="_blank" rel="noreferrer">Inspect Bitcoin balance <ExternalLink size={14}/></a></>}</div></div></div>}
        {selected && <section className="recipient-share"><div><strong>{recipientUrl.local ? 'Recipient preview' : 'Recipient link'}</strong><p>The gift is assigned to <b>{selected.owner_id}</b>. {isOwner && !selected.redemption_started ? 'Transfer it to the recipient’s NEAR account before they can redeem.' : 'Only that account can redeem; this link does not transfer ownership.'}</p>{recipientUrl.local && <small>Local preview only. Publish this app before sharing it with someone on another device.</small>}</div><div><a className="secondary-button" href={recipientUrl.href}>Open recipient page <ArrowUpRight size={16}/></a><CopyButton value={recipientUrl.href} label={recipientUrl.local ? 'Copy local preview' : 'Copy recipient link'}/></div></section>}
        {!selected && readAt && <p className="empty-state">This gift wasn’t found. Check the ID in your link.</p>}
        {gifts.length === 0 && <div className="empty-state">{error ? 'Public testnet reads are unavailable. No gift state has been inferred.' : 'Reading gifts from NEAR testnet…'}</div>}
        {selected && <details className="manage-details" id="manage"><summary><span><KeyRound size={18}/> Transfer or redeem this gift</span><small>{isOwner ? 'You are the current holder' : 'Connect the current holder’s wallet to act'} <ArrowDownRight size={16}/></small></summary><div className="action-grid"><form className="action-card" onSubmit={transferGift}><h3>Pass the claim</h3><p>The next NEAR holder gets permission to request the Bitcoin signature.</p><label>Recipient NEAR account<input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="winner.testnet" required disabled={!isOwner || selected.redemption_started}/></label><button className="primary-button" type="submit" disabled={!isOwner || selected.redemption_started || !!busy}>Transfer claim <ArrowRight size={16}/></button><small className="action-warning">Prototype: an admin upgrade key remains.</small></form><form className="action-card" onSubmit={prepareClaim}><h3>Redeem native Bitcoin</h3><p>Signing freezes transfers. A replacement signature does not invalidate a previously signed payout.</p><label>Your Bitcoin testnet4 address<input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="tb1q…" disabled={!canAuthorize}/></label><button className="primary-button" type="submit" disabled={!canAuthorize || !!busy || !balance}>Review my payout <ArrowRight size={16}/></button>{reviewRecord && <div className="recipient-review"><h3>Review your payout</h3><code>{reviewRecord.destination}</code><strong>{sats(reviewRecord.amount)} test sats · {sats(reviewRecord.fee)}-sat fee</strong><button className="primary-button" type="button" onClick={authorizeReviewed} disabled={!!busy}>Approve in my wallet <ArrowRight size={16}/></button></div>}{canBroadcast && <button className="secondary-button" type="button" onClick={broadcastClaim} disabled={!!busy}>Broadcast prepared Bitcoin payout <ExternalLink size={16}/></button>}{storedTxid && <a className="proof-link" href={btcTx(storedTxid)} target="_blank" rel="noreferrer">Your Bitcoin transaction <ExternalLink size={14}/></a>}<small className="action-warning">Destination and fee policy are not fully enforced on chain. Test assets only.</small></form></div></details>}
      </section>

      <section className="transaction-section wrap" id="transactions"><span id="proof"/><details className="transaction-details" open={transactionsOpen} onToggle={(e) => setTransactionsOpen(e.currentTarget.open)}><summary>Transaction details {selected ? `· Gift #${selected.id}` : ''}</summary><div className="transaction-body">{selected ? <><p>Current holder: <strong>{selected.owner_id}</strong>. {selected.pending ? 'Approval is processing.' : selected.redemption_started ? 'Claim transfers are frozen because signing began.' : 'The claim can be transferred by its holder.'}</p>{showingPayout ? <><h3>Recorded activity · {RECORDED_GIFT.date}</h3><dl><div><dt>Claim created</dt><dd><a href={nearTx(RECORDED_GIFT.mint)} target="_blank" rel="noreferrer">NEAR transaction <ExternalLink size={13}/></a></dd></div><div><dt>Claim transferred</dt><dd><a href={nearTx(RECORDED_GIFT.transfer)} target="_blank" rel="noreferrer">NEAR transaction <ExternalLink size={13}/></a></dd></div><div><dt>Holder approved payout</dt><dd><a href={nearTx(RECORDED_GIFT.sign)} target="_blank" rel="noreferrer">NEAR transaction <ExternalLink size={13}/></a></dd></div><div><dt>Bitcoin payout</dt><dd><a data-testid="payout-proof" href={btcTx(RECORDED_GIFT.payout)} target="_blank" rel="noreferrer">{payout ? `${sats(payout.amount)} test sats · ${payout.confirmed ? `confirmed in block ${sats(payout.block)}` : 'unconfirmed'}` : payoutError ? 'Public recheck unavailable; inspect transaction' : 'Checking public Bitcoin transaction…'} <ExternalLink size={13}/></a></dd></div></dl><p>These are recorded transactions. Opening this page makes no new payment. The recorded NEAR wallet used terminal signing; the browser prepared and broadcast the Bitcoin payout.</p><a className="secondary-button" href={recipientUrl.href}>Open recipient page <ArrowUpRight size={15}/></a></> : storedTxid ? <a href={btcTx(storedTxid)} target="_blank" rel="noreferrer">Inspect the transaction recorded in this browser <ExternalLink size={13}/></a> : <p>No Bitcoin payout is recorded here. An approval or an empty balance alone does not establish delivery.</p>}</> : <p>Select a gift to inspect its transaction status.</p>}<p><a href="https://github.com/bebe0307mz/prizekey/blob/main/evidence/README.md" target="_blank" rel="noreferrer">Evidence and older examples <ExternalLink size={13}/></a></p></div></details></section>

      <section className="create-section wrap" id="create"><details className="create-details" open={createOpen} onToggle={(e) => setCreateOpen(e.currentTarget.open)}><summary><span><Gift size={22}/><strong>Create a gift</strong></span><span>0.01 testnet NEAR storage <ArrowDownRight size={18}/></span></summary><form className="form-card" onSubmit={createGift}><label>Gift title<input maxLength="80" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A little Bitcoin" required /></label><label>A note for the winner<textarea maxLength="240" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Say something memorable…" rows="2" /></label><button className="primary-button" disabled={!!busy || !account} type="submit">{busy === 'Creating gift' ? 'Creating…' : account ? 'Create gift' : 'Connect a wallet to create'} <ArrowRight size={18}/></button><p className="action-warning">Create the NEAR claim, fund its Bitcoin testnet4 address, then pass it on. All assets have no value.</p></form></details><details className="limits"><summary>Prototype limits & trust</summary><p>NEAR testnet and Bitcoin testnet4 only. The contract checks the current holder before requesting a Chain Signatures MPC signature; it still has an admin upgrade key. The deployed contract does not bind every Bitcoin destination or fee detail. Direct transfer works; full NEP-171 interoperability is incomplete. Redemption supports one UTXO per gift. Beginning redemption freezes claim transfers, and an earlier signed payout may still broadcast after reauthorization.</p></details></section>
    </main>
    <footer className="site-footer wrap"><a className="brand" href="#top"><KeyRound size={20}/><span>prizekey.</span></a><span>Testnet prototype · No monetary value</span><a href="https://github.com/bebe0307mz/prizekey" target="_blank" rel="noreferrer">Source <ArrowUpRight size={15}/></a></footer>
    {(notice || error || lastTx) && <div className={error ? 'toast error' : 'toast'} role="status"><button aria-label="Dismiss" onClick={() => { setNotice(''); setError(''); setLastTx(null); }}><X size={16}/></button><strong>{error ? 'Something needs attention' : busy || 'On-chain update'}</strong><p>{error || notice}</p>{lastTx && <a href={lastTx.bitcoin ? btcTx(lastTx.hash) : nearTx(lastTx.hash)} target="_blank" rel="noreferrer">{lastTx.label} <ExternalLink size={14}/></a>}</div>}
  </div>;
}

export default App;
