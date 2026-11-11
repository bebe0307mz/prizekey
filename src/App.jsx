import { useCallback, useEffect, useMemo, useState } from 'react';
import { NearConnector } from '@hot-labs/near-connect';
import { contracts, chainAdapters } from 'chainsig.js';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Bitcoin, Check, CircleHelp, Copy, ExternalLink, Gift, KeyRound, LockKeyhole, Menu, Send, ShieldCheck, Sparkles, Wallet, X } from 'lucide-react';

const CONTRACT = 'prizekey-v1-11b.testnet';
const NEAR_RPC = 'https://rpc.testnet.near.org';
const BTC_API = 'https://mempool.space/testnet4/api';
const ONE_NEAR = 10n ** 24n;
const GAS = '150000000000000';
const connector = new NearConnector({ network: 'testnet', providers: { testnet: ['https://test.rpc.fastnear.com'] } });
const signer = new contracts.ChainSignatureContract({ networkId: 'testnet', contractId: 'v1.signer-prod.testnet' });
const bitcoin = new chainAdapters.btc.Bitcoin({
  network: 'testnet', contract: signer,
  btcRpcAdapter: new chainAdapters.btc.BTCRpcAdapters.Mempool(BTC_API),
});

async function view(method, args = {}) {
  const response = await fetch(NEAR_RPC, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'prizekey', method: 'query', params: {
      request_type: 'call_function', finality: 'final', account_id: CONTRACT, method_name: method,
      args_base64: btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(args)))),
    } }),
  });
  const body = await response.json();
  if (body.error) throw new Error(body.error.message || 'NEAR RPC failed');
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(body.result.result)));
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
  const [selectedId, setSelectedId] = useState(null);
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

  const selected = useMemo(() => gifts.find((g) => g.id === selectedId) ?? null, [gifts, selectedId]);
  const isOwner = !!selected && account === selected.owner_id;

  const refresh = useCallback(async (preferredId = null) => {
    const total = await view('total_gifts');
    const ids = Array.from({ length: Math.min(total, 24) }, (_, i) => total - 1 - i);
    const rows = await Promise.all(ids.map((id) => view('gift', { token_id: String(id) })));
    setGifts(rows.filter(Boolean));
    setSelectedId((current) => preferredId ?? current ?? (rows[0]?.id ?? null));
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
    bitcoin.deriveAddressAndPublicKey(CONTRACT, `prizekey-btc-v1-${selectedId}`).then(async (derived) => {
      if (!active) return;
      setAddress(derived.address); setPublicKey(derived.publicKey);
      const response = await fetch(`${BTC_API}/address/${derived.address}/utxo`);
      const utxos = await response.json();
      if (active && Array.isArray(utxos)) setBalance(utxos.reduce((n, u) => n + u.value, 0));
    }).catch((e) => { if (active) setError(`Bitcoin address lookup: ${e.message}`); });
    return () => { active = false; };
  }, [selectedId]);

  const run = async (label, fn) => {
    setBusy(label); setError(''); setNotice('');
    try { await fn(); } catch (e) { setError(e.message || String(e)); }
    finally { setBusy(''); }
  };

  const connect = () => run('Connecting wallet', async () => { await connector.connect(); });
  const createGift = (e) => { e.preventDefault(); run('Creating gift', async () => {
    if (!account) throw new Error('Connect a NEAR testnet wallet first');
    const tx = await call('create_gift', { title: title.trim(), message: message.trim() }, (ONE_NEAR / 100n).toString(), '30000000000000');
    const total = await view('total_gifts');
    await refresh(total - 1);
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
    if (selected.redemption_started) throw new Error('Redemption has already started');
    if (!/^tb1[ac-hj-np-z02-9]{20,90}$/.test(destination)) throw new Error('Enter a Bitcoin testnet4 SegWit address');
    if (!address || !publicKey) throw new Error('Bitcoin gift address is still loading');
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
    setLastTx({ label: 'Bitcoin signature authorized on NEAR', hash: tx.transaction.hash });
    await refresh(selected.id);
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
  const canBroadcast = !!storedClaim && !!selected?.last_signature && !selected?.pending;

  return <div className="app-shell">
    <header className="site-header">
      <a className="brand" href="#top" aria-label="PrizeKey home"><span className="brand-mark"><KeyRound size={22} strokeWidth={2.3} /></span><span>prizekey<span className="brand-dot">.</span></span></a>
      <nav className={menuOpen ? 'nav-links open' : 'nav-links'}><a href="#how" onClick={() => setMenuOpen(false)}>How it works</a><a href="#explore" onClick={() => setMenuOpen(false)}>Explore gifts</a><a href="#proof" onClick={() => setMenuOpen(false)}>Live proof</a></nav>
      <div className="header-actions"><span className="network-pill"><span /> TESTNET ONLY</span><button className="wallet-button" onClick={account ? () => connector.disconnect() : connect} disabled={walletLoading || !!busy}><Wallet size={16} />{walletLoading ? 'Checking…' : account ? short(account, 11, 7) : 'Connect wallet'}</button><button className="mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div>
    </header>

    <main id="top">
      <section className="hero wrap">
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-star">✳</span> A BETTER WAY TO GIVE BITCOIN</div><h1>Give Bitcoin.<br /><em>Keep the magic.</em></h1><p>A gift they can pass along or redeem. Real Bitcoin stays on Bitcoin. The current holder controls it through one transferable claim on NEAR.</p><div className="hero-cta"><a className="primary-button" href="#create"><Gift size={18} /> Create a gift <ArrowRight size={18} /></a><a className="text-button" href="#how">See how it works <ArrowDownRight size={18} /></a></div><div className="hero-foot"><span className="avatar-stack"><span>₿</span><span>✦</span><span>◎</span></span><span>Native BTC · No shared seed phrase · No wrapped token</span></div></div>
        <div className="hero-visual" aria-label="Preview of a PrizeKey gift card"><div className="orbit-line orbit-one" /><div className="orbit-line orbit-two" /><div className="mini-spark mini-one">✳</div><div className="mini-spark mini-two">✧</div><div className="gift-card hero-card"><div className="card-top"><span>PRIZEKEY / 001</span><span className="card-seal"><Bitcoin size={25} /></span></div><div className="card-art"><span className="card-ring ring-a"/><span className="card-ring ring-b"/><span className="card-ring ring-c"/><span className="card-core">₿</span></div><div className="card-bottom"><span>Something good<br /><strong>is yours.</strong></span><span className="card-arrow"><ArrowUpRight size={22}/></span></div></div><div className="floating-label"><span className="floating-icon"><ShieldCheck size={19}/></span><span><strong>Actually yours</strong><small>Held by the current owner</small></span></div></div>
      </section>

      <section className="trust-strip"><div className="wrap trust-inner"><div><Bitcoin size={20}/><strong>Native Bitcoin</strong><span>No bridge or wrapped asset</span></div><div><KeyRound size={20}/><strong>No seed phrase to share</strong><span>NEAR contract controls the key</span></div><div><Send size={20}/><strong>Pass it on</strong><span>Ownership moves with the claim</span></div></div></section>

      <section className="section how-section wrap" id="how"><div className="section-intro"><span className="section-kicker">01 / THE SIMPLE PART</span><h2>It feels like a gift.<br /><em>It works like ownership.</em></h2><p>All the cryptography stays behind the scenes. Four steps, two public networks, and one clear handoff.</p></div><div className="steps-grid"><article><span className="step-number">01</span><div className="step-icon peach"><Gift size={25}/></div><h3>Make a gift</h3><p>Create a transferable claim on NEAR with a name and a note.</p></article><article><span className="step-number">02</span><div className="step-icon blue"><Bitcoin size={25}/></div><h3>Add Bitcoin</h3><p>Send testnet4 BTC to the gift’s own Bitcoin address. It never becomes wrapped BTC.</p></article><article><span className="step-number">03</span><div className="step-icon lavender"><Send size={25}/></div><h3>Pass it along</h3><p>Transfer the claim. Only its current owner can ask NEAR to sign for that address.</p></article><article><span className="step-number">04</span><div className="step-icon green"><Wallet size={25}/></div><h3>Redeem anywhere</h3><p>The holder sweeps Bitcoin to their own testnet4 wallet. The claim then locks.</p></article></div></section>

      <section className="workspace-section" id="create"><div className="wrap workspace-grid"><div className="workspace-heading"><span className="section-kicker">02 / MAKE IT REAL</span><h2>Your next gift<br /><em>starts here.</em></h2><p>Create on NEAR testnet, then fund its Bitcoin address. The contract charges 0.01 testnet NEAR for storage.</p><div className="note-box"><Sparkles size={18}/><span>This is a live testnet prototype. Testnet BTC and NEAR have no monetary value.</span></div></div><form className="form-card" onSubmit={createGift}><div className="form-card-head"><span className="form-icon"><Gift size={20}/></span><span>CREATE A PRIZEKEY</span></div><label>Gift title<input maxLength="80" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A little Bitcoin" required /></label><label>Your note<textarea maxLength="240" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Say something memorable…" rows="3" /></label><div className="form-hint"><LockKeyhole size={16}/><span>Your gift gets a unique Bitcoin address controlled by this NEAR contract.</span></div><button className="primary-button wide" disabled={!!busy || !account} type="submit">{busy === 'Creating gift' ? 'Creating…' : account ? 'Create gift' : 'Connect a wallet to create'} <ArrowRight size={18}/></button></form></div></section>

      <section className="section explore-section wrap" id="explore"><div className="explore-head"><div><span className="section-kicker">03 / THE GIFT DESK</span><h2>Every gift has <em>a story.</em></h2><p>Inspect a live claim, its holder, and the actual Bitcoin held at its address.</p></div><button className="quiet-button" onClick={() => run('Refreshing gifts', () => refresh())}>Refresh on-chain data ↗</button></div>
        {gifts.length === 0 ? <div className="empty-state"><Gift size={30}/><strong>No gifts yet</strong><span>Create the first PrizeKey above.</span></div> : <div className="explore-grid"><div className="gift-list">{gifts.map((gift) => <button type="button" className={selectedId === gift.id ? 'gift-list-item selected' : 'gift-list-item'} key={gift.id} onClick={() => setSelectedId(gift.id)}><span className="gift-list-icon"><Bitcoin size={22}/></span><span><strong>{gift.title}</strong><small>Gift #{String(gift.id).padStart(3, '0')} · {gift.redemption_started ? 'Redemption started' : 'Transferable'}</small></span><ArrowUpRight size={18}/></button>)}</div>
          {selected && <div className="gift-detail"><div className="detail-top"><div><span className="tiny-label">LIVE ON NEAR TESTNET</span><h3>{selected.title}</h3><p>{selected.message || 'A Bitcoin gift.'}</p></div><span className={selected.redemption_started ? 'status-chip claimed' : 'status-chip'}>{selected.redemption_started ? 'Redemption started' : 'Transferable'}</span></div><div className="detail-stat-row"><div><small>BITCOIN AT THIS GIFT</small><strong>{balance == null ? 'Loading…' : `${sats(balance)} sats`}</strong><span>{balance == null ? 'Reading testnet4' : balance > 0 ? 'Live UTXO balance' : 'No unspent output'}</span></div><div><small>CURRENT HOLDER</small><strong className="account-value">{short(selected.owner_id, 16, 9)}</strong><span>{isOwner ? 'This is your claim' : 'Verified on NEAR'}</span></div></div><div className="address-box"><span>GIFT’S BITCOIN ADDRESS</span><code>{address || 'Deriving address…'}</code><div>{address && <><CopyButton value={address} label="Copy address"/><a href={`https://mempool.space/testnet4/address/${address}`} target="_blank" rel="noreferrer">View on Bitcoin <ExternalLink size={14}/></a></>}</div></div><div className="detail-foot"><span><ShieldCheck size={17}/> {selected.redemption_started ? 'Transfer frozen after signature request' : 'Only the holder can authorize the payout'}</span><a href={`https://testnet.nearblocks.io/address/${CONTRACT}`} target="_blank" rel="noreferrer">View contract <ArrowUpRight size={15}/></a></div></div>}</div>}
        {selected && <div className="action-grid"><form className="action-card" onSubmit={transferGift}><div className="action-icon lavender"><Send size={22}/></div><h3>Pass it to someone</h3><p>Transfer the claim to another NEAR testnet account. They become the only holder who can redeem.</p><label>Recipient NEAR account<input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="friend.testnet" required disabled={!isOwner || selected.redemption_started}/></label><button className="dark-button" type="submit" disabled={!isOwner || selected.redemption_started || !!busy}>Transfer claim <ArrowRight size={16}/></button></form><form className="action-card" onSubmit={prepareClaim}><div className="action-icon peach"><ArrowUpRight size={22}/></div><h3>Redeem the Bitcoin</h3><p>Sweep the gift’s testnet4 BTC to your own wallet. Starting redemption permanently freezes transfers.</p><label>Your Bitcoin testnet4 address<input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="tb1q…" disabled={!isOwner || selected.redemption_started}/></label><button className="dark-button" type="submit" disabled={!isOwner || selected.redemption_started || !!busy || !balance}>Authorize payout <ArrowRight size={16}/></button>{canBroadcast && <button className="secondary-button" type="button" onClick={broadcastClaim} disabled={!!busy}>Broadcast prepared Bitcoin payout <ExternalLink size={16}/></button>}{storedTxid && <a className="proof-link" href={btcTx(storedTxid)} target="_blank" rel="noreferrer">Your Bitcoin transaction <ExternalLink size={14}/></a>}</form></div>}
      </section>

      <section className="proof-section" id="proof"><div className="wrap proof-inner"><div><span className="section-kicker">04 / DON’T TAKE OUR WORD FOR IT</span><h2>Two networks.<br /><em>One real handoff.</em></h2><p>The first gift was minted, funded, transferred, and redeemed on public test networks. Follow each step yourself.</p></div><div className="proof-list"><a href={nearTx('7mY4uwVVcaxA9rwy4GeTWMTDTbT1QHmKxVwBquHcWcH4')} target="_blank" rel="noreferrer"><span>01 <strong>Gift minted on NEAR</strong></span><ExternalLink size={18}/></a><a href={btcTx('383a3177c5c812b3b0bf79b53cddb47fc24a9365a2f74ba72df8c1c4a21cf1b1')} target="_blank" rel="noreferrer"><span>02 <strong>Native Bitcoin funded</strong></span><ExternalLink size={18}/></a><a href={nearTx('9e9VnrkqdUUFmj1pnKzjNK911sm6j5m8rGWudEU6w51R')} target="_blank" rel="noreferrer"><span>03 <strong>Claim transferred</strong></span><ExternalLink size={18}/></a><a href={nearTx('CB874dcpxSy8t9xwgieuA5aPvzjmgQ23ZTvLHEjdVbNd')} target="_blank" rel="noreferrer"><span>04 <strong>New holder authorized payout</strong></span><ExternalLink size={18}/></a><a href={btcTx('f255c70347b79eacbe48209d9b9c70b56e0455b2c11983698df758ddf67d96ff')} target="_blank" rel="noreferrer"><span>05 <strong>Bitcoin sent to holder</strong></span><ExternalLink size={18}/></a></div></div></section>
    </main>
    <footer className="site-footer"><div className="wrap footer-inner"><div className="brand"><span className="brand-mark"><KeyRound size={20}/></span><span>prizekey<span className="brand-dot">.</span></span></div><span>Built for NEAR Hackathon 2026 · Bitcoin testnet4 + NEAR testnet</span><a href="https://github.com/bebe0307mz/prizekey" target="_blank" rel="noreferrer">Source code <ArrowUpRight size={15}/></a></div></footer>
    {(notice || error || lastTx) && <div className={error ? 'toast error' : 'toast'} role="status"><button aria-label="Dismiss" onClick={() => { setNotice(''); setError(''); setLastTx(null); }}><X size={16}/></button><strong>{error ? 'Something needs attention' : busy || 'On-chain update'}</strong><p>{error || notice}</p>{lastTx && <a href={lastTx.bitcoin ? btcTx(lastTx.hash) : nearTx(lastTx.hash)} target="_blank" rel="noreferrer">{lastTx.label} <ExternalLink size={14}/></a>}</div>}
  </div>;
}

export default App;
