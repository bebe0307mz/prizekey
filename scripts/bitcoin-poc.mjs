import { readFileSync, writeFileSync } from 'node:fs';
import { contracts, chainAdapters } from 'chainsig.js';

const account = 'prizekey-poc-11a7.testnet';
const sourcePath = 'probe-v1';
const recipientPath = 'recipient-v1';
const api = 'https://mempool.space/testnet4/api';
const file = new URL('../evidence/poc-spend-local.json', import.meta.url);
const chainSig = new contracts.ChainSignatureContract({ networkId: 'testnet', contractId: 'v1.signer-prod.testnet' });
const bitcoin = new chainAdapters.btc.Bitcoin({
  network: 'testnet', contract: chainSig,
  btcRpcAdapter: new chainAdapters.btc.BTCRpcAdapters.Mempool(api),
});

async function nearView(method) {
  const response = await fetch('https://rpc.testnet.near.org', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'prizekey-poc', method: 'query', params: {
      request_type: 'call_function', finality: 'final', account_id: account, method_name: method, args_base64: 'e30=',
    } }),
  });
  const body = await response.json();
  if (body.error) throw new Error(JSON.stringify(body.error));
  return JSON.parse(Buffer.from(body.result.result).toString());
}

async function prepare() {
  const from = await bitcoin.deriveAddressAndPublicKey(account, sourcePath);
  const to = process.env.DESTINATION_BTC
    ? { address: process.env.DESTINATION_BTC }
    : await bitcoin.deriveAddressAndPublicKey(account, recipientPath);
  const utxos = await (await fetch(`${api}/address/${from.address}/utxo`)).json();
  if (!Array.isArray(utxos) || utxos.length !== 1) throw new Error('Expected one funded POC UTXO');
  const input = utxos[0];
  const parent = await (await fetch(`${api}/tx/${input.txid}`)).json();
  const fee = 250;
  const value = Number(process.env.AMOUNT_SATS ?? '10000');
  if (!Number.isSafeInteger(value) || value < 1_000 || value + fee >= input.value) throw new Error('Invalid amount');
  const { transaction, hashesToSign } = await bitcoin.prepareTransactionForSigning({
    publicKey: from.publicKey,
    inputs: [{ txid: input.txid, vout: input.vout, value: input.value,
      scriptPubKey: Buffer.from(parent.vout[input.vout].scriptpubkey, 'hex') }],
    outputs: [{ address: to.address, value }, { address: from.address, value: input.value - value - fee }],
  });
  if (hashesToSign.length !== 1) throw new Error('Expected exactly one BTC signature');
  const payloadHex = Buffer.from(hashesToSign[0]).toString('hex');
  const record = { account, from, to, input: { txid: input.txid, vout: input.vout, value: input.value }, fee,
    value, payloadHex, serialized: bitcoin.serializeTransaction(transaction) };
  writeFileSync(file, JSON.stringify(record, null, 2));
  console.log(JSON.stringify({ from: from.address, to: to.address, amount_sats: value, payloadHex, input: record.input }, null, 2));
  console.log('Call sign_probe on NEAR testnet with payloadHex, then run finalize.');
}

async function finalize() {
  const record = JSON.parse(readFileSync(file, 'utf8'));
  const [pending, encoded] = await nearView('probe_state');
  if (pending || !encoded) throw new Error('No final contract-controlled signature');
  const sig = JSON.parse(encoded);
  if (sig.scheme !== 'Secp256k1') throw new Error('Unexpected signature scheme');
  const rsv = { r: sig.big_r.affine_point.slice(2), s: sig.s.scalar, v: sig.recovery_id + 27 };
  const rawTx = bitcoin.finalizeTransactionSigning({
    transaction: bitcoin.deserializeTransaction(record.serialized), rsvSignatures: [rsv],
  });
  console.log(JSON.stringify({ rawTx, from: record.from.address, to: record.to.address, amount_sats: record.value }, null, 2));
  if (process.argv[2] === 'broadcast') {
    const result = await bitcoin.broadcastTx(rawTx);
    console.log(JSON.stringify({ txid: result.hash, explorer: `https://mempool.space/testnet4/tx/${result.hash}` }));
  }
}

if (process.argv[2] === 'prepare') await prepare();
else if (['finalize', 'broadcast'].includes(process.argv[2])) await finalize();
else throw new Error('Usage: node scripts/bitcoin-poc.mjs prepare|finalize|broadcast');
