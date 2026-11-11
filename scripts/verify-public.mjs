import assert from 'node:assert/strict';
import { contracts, chainAdapters } from 'chainsig.js';

const contract = 'prizekey-v1-11b.testnet';
const btcApi = 'https://mempool.space/testnet4/api';
const fundingTxid = '383a3177c5c812b3b0bf79b53cddb47fc24a9365a2f74ba72df8c1c4a21cf1b1';
const payoutTxid = 'f255c70347b79eacbe48209d9b9c70b56e0455b2c11983698df758ddf67d96ff';
const prizeFundingTxid = 'b201de6a6bf2605fe06a05e920267a7327ab46c4bed6d65c1529e41c1ea2feef';
const recipient = 'prizekey-recipient-11b.testnet';
const destination = 'tb1qfmv0pfzuv0pu5fa570a8nrm7rs6jkpxkv0a6fj';

async function json(url, options) {
  const response = await fetch(url, options);
  assert.equal(response.ok, true, `${url}: HTTP ${response.status}`);
  return response.json();
}

async function view(method, args) {
  const body = await json('https://rpc.testnet.near.org', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'prizekey-verifier', method: 'query', params: {
      request_type: 'call_function', finality: 'final', account_id: contract,
      method_name: method, args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
    } }),
  });
  assert.equal(body.error, undefined, JSON.stringify(body.error));
  return JSON.parse(Buffer.from(body.result.result).toString());
}

const gift = await view('gift', { token_id: '0' });
const prize = await view('gift', { token_id: '1' });
assert.equal(gift.owner_id, recipient);
assert.equal(gift.redemption_started, true);
assert.equal(gift.pending, false);
assert.equal(typeof gift.last_signature, 'string');
assert.match(gift.last_payload_hex, /^[0-9a-f]{64}$/);
assert.equal(prize.owner_id, 'prizekey-poc-11a7.testnet');
assert.equal(prize.redemption_started, false);

const signer = new contracts.ChainSignatureContract({ networkId: 'testnet', contractId: 'v1.signer-prod.testnet' });
const bitcoin = new chainAdapters.btc.Bitcoin({ network: 'testnet', contract: signer,
  btcRpcAdapter: new chainAdapters.btc.BTCRpcAdapters.Mempool(btcApi) });
const { address } = await bitcoin.deriveAddressAndPublicKey(contract, 'prizekey-btc-v1-0');
assert.equal(address, 'tb1qlnh99fd5amupc6tf65gh8a7eu37ujl94dj0cht');
const { address: prizeAddress } = await bitcoin.deriveAddressAndPublicKey(contract, 'prizekey-btc-v1-1');
assert.equal(prizeAddress, 'tb1qtwwe5nlkzpnv3tj8rd5gn4wjrn6nejve3flhfm');

const [funding, payout, payoutStatus] = await Promise.all([
  json(`${btcApi}/tx/${fundingTxid}`), json(`${btcApi}/tx/${payoutTxid}`),
  json(`${btcApi}/tx/${payoutTxid}/status`),
]);
const [prizeUtxos, prizeStatus] = await Promise.all([
  json(`${btcApi}/address/${prizeAddress}/utxo`),
  json(`${btcApi}/tx/${prizeFundingTxid}/status`),
]);
assert.ok(prizeUtxos.some((u) => u.txid === prizeFundingTxid && u.value === 100_000), 'live prize funding missing');
assert.equal(prizeStatus.confirmed, true, 'prize funding is not confirmed');
const fundedOutput = funding.vout.findIndex((o) => o.scriptpubkey_address === address && o.value === 100_000);
assert.notEqual(fundedOutput, -1, 'funding output missing');
assert.ok(payout.vin.some((i) => i.txid === fundingTxid && i.vout === fundedOutput), 'payout did not spend gift output');
assert.ok(payout.vout.some((o) => o.scriptpubkey_address === destination && o.value === 99_750), 'recipient payout missing');
assert.equal(payoutStatus.confirmed, true, 'payout is not confirmed');

console.log(JSON.stringify({ result: 'PASS', gift_id: gift.id, current_owner: gift.owner_id,
  gift_btc_address: address, funded_sats: 100_000, paid_sats: 99_750,
  fee_sats: funding.vout[fundedOutput].value - 99_750,
  payout_txid: payoutTxid, confirmed_block_height: payoutStatus.block_height }, null, 2));
console.log(JSON.stringify({ result: 'PASS', gift_id: prize.id, current_owner: prize.owner_id,
  transferable: !prize.redemption_started, gift_btc_address: prizeAddress,
  live_funded_sats: 100_000, funding_txid: prizeFundingTxid,
  confirmed_block_height: prizeStatus.block_height }, null, 2));
