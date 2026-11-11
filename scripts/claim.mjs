import { readFileSync, writeFileSync } from 'node:fs';
import { contracts, chainAdapters } from 'chainsig.js';

const contract = process.env.GIFT_CONTRACT ?? 'prizekey-v1-11b.testnet';
const tokenId = process.env.TOKEN_ID ?? '0';
const api = 'https://mempool.space/testnet4/api';
const file = new URL('../evidence/claim-local.json', import.meta.url);
const chainSig = new contracts.ChainSignatureContract({ networkId: 'testnet', contractId: 'v1.signer-prod.testnet' });
const bitcoin = new chainAdapters.btc.Bitcoin({
  network: 'testnet', contract: chainSig,
  btcRpcAdapter: new chainAdapters.btc.BTCRpcAdapters.Mempool(api),
});

async function nearView(method, args) {
  const response = await fetch('https://rpc.testnet.near.org', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'prizekey', method: 'query', params: {
      request_type: 'call_function', finality: 'final', account_id: contract, method_name: method,
      args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
    } }),
  });
  const body = await response.json();
  if (body.error) throw new Error(JSON.stringify(body.error));
  return JSON.parse(Buffer.from(body.result.result).toString());
}

async function prepare() {
  const gift = await nearView('gift', { token_id: tokenId });
  if (!gift || gift.pending || gift.redemption_started) throw new Error('Gift is missing or already redeeming');
  const destination = process.env.DESTINATION_BTC;
  if (!destination || !/^tb1[ac-hj-np-z02-9]{20,90}$/.test(destination)) throw new Error('Set DESTINATION_BTC to a testnet4 SegWit address');
  const path = await nearView('btc_path', { id: Number(tokenId) });
  const from = await bitcoin.deriveAddressAndPublicKey(contract, path);
  const utxos = await (await fetch(`${api}/address/${from.address}/utxo`)).json();
  if (!Array.isArray(utxos) || utxos.length !== 1) throw new Error('MVP requires exactly one funded Bitcoin UTXO');
  const input = utxos[0];
  const parent = await (await fetch(`${api}/tx/${input.txid}`)).json();
  const fee = Number(process.env.FEE_SATS ?? '250');
  if (!Number.isSafeInteger(fee) || fee < 140 || fee >= input.value - 546) throw new Error('Invalid Bitcoin fee');
  const amount = input.value - fee;
  const { transaction, hashesToSign } = await bitcoin.prepareTransactionForSigning({
    publicKey: from.publicKey,
    inputs: [{ txid: input.txid, vout: input.vout, value: input.value,
      scriptPubKey: Buffer.from(parent.vout[input.vout].scriptpubkey, 'hex') }],
    outputs: [{ address: destination, value: amount }],
  });
  if (hashesToSign.length !== 1) throw new Error('Expected one signature');
  const payloadHex = Buffer.from(hashesToSign[0]).toString('hex');
  const record = { contract, tokenId, owner: gift.owner_id, path, from, destination,
    input: { txid: input.txid, vout: input.vout, value: input.value }, fee, amount, payloadHex,
    serialized: bitcoin.serializeTransaction(transaction) };
  writeFileSync(file, JSON.stringify(record, null, 2));
  console.log(JSON.stringify({ contract, tokenId, owner: gift.owner_id, source: from.address,
    destination, amount_sats: amount, fee_sats: fee, payloadHex }, null, 2));
  console.log('Current owner must call request_btc_signature with token_id and payloadHex. Then run finalize.');
}

async function finalize() {
  const record = JSON.parse(readFileSync(file, 'utf8'));
  const gift = await nearView('gift', { token_id: record.tokenId });
  if (!gift || gift.owner_id !== record.owner || gift.pending || !gift.redemption_started
      || gift.last_payload_hex !== record.payloadHex || !gift.last_signature) {
    throw new Error('On-chain gift state does not match the prepared Bitcoin transaction');
  }
  const sig = JSON.parse(gift.last_signature);
  if (sig.scheme !== 'Secp256k1') throw new Error('Unexpected MPC signature');
  const rsv = { r: sig.big_r.affine_point.slice(2), s: sig.s.scalar, v: sig.recovery_id + 27 };
  const rawTx = bitcoin.finalizeTransactionSigning({
    transaction: bitcoin.deserializeTransaction(record.serialized), rsvSignatures: [rsv],
  });
  console.log(JSON.stringify({ source: record.from.address, destination: record.destination,
    amount_sats: record.amount, fee_sats: record.fee, rawTx }, null, 2));
  if (process.argv[2] === 'broadcast') {
    const result = await bitcoin.broadcastTx(rawTx);
    console.log(JSON.stringify({ txid: result.hash, explorer: `https://mempool.space/testnet4/tx/${result.hash}` }));
  }
}

if (process.argv[2] === 'prepare') await prepare();
else if (['finalize', 'broadcast'].includes(process.argv[2])) await finalize();
else throw new Error('Usage: node scripts/claim.mjs prepare|finalize|broadcast');
