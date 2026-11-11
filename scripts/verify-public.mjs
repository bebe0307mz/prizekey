import assert from 'node:assert/strict';
import { contracts, chainAdapters } from 'chainsig.js';
import bitcoinjs from 'bitcoinjs-lib';

const contract = 'prizekey-v1-11b.testnet';
const btcApi = 'https://mempool.space/testnet4/api';
const fundingTxid = '383a3177c5c812b3b0bf79b53cddb47fc24a9365a2f74ba72df8c1c4a21cf1b1';
const payoutTxid = 'f255c70347b79eacbe48209d9b9c70b56e0455b2c11983698df758ddf67d96ff';
const prizeFundingTxid = 'b201de6a6bf2605fe06a05e920267a7327ab46c4bed6d65c1529e41c1ea2feef';
const recipient = 'prizekey-recipient-11b.testnet';
const destination = 'tb1qfmv0pfzuv0pu5fa570a8nrm7rs6jkpxkv0a6fj';
const browserGiftId = '2';
const browserCreator = 'prizekey-poc-11a7.testnet';
const browserMintTx = '9FG1zzvcndTZS51w3J4UFWkUnVQnF1PSjRpwMS2ZDSE3';
const browserTransferTx = 'C2Km3c5KkduLeRfv7tS9Kt829kNYmBnxj92CMg66iu4N';

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

async function nearTx(hash, signer) {
  const body = await json('https://rpc.testnet.near.org', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'prizekey-verifier-tx', method: 'tx', params: [hash, signer] }),
  });
  assert.equal(body.error, undefined, JSON.stringify(body.error));
  assert.equal(body.result.final_execution_status, 'FINAL', `${hash} not final`);
  assert.ok(body.result.status?.SuccessValue != null, `${hash} failed`);
  return body.result;
}

function assertNearAction(tx, method, args, deposit) {
  assert.equal(tx.transaction.receiver_id, contract);
  assert.equal(tx.transaction.actions.length, 1);
  const action = tx.transaction.actions[0].FunctionCall;
  assert.equal(action.method_name, method);
  assert.deepEqual(JSON.parse(Buffer.from(action.args, 'base64').toString()), args);
  assert.equal(action.deposit, deposit);
}

function hasNftEvent(tx, eventName, tokenId, ownerId, receiverId) {
  return tx.receipts_outcome.some((receipt) => receipt.outcome.executor_id === contract &&
    receipt.outcome.logs.some((line) => {
      if (!line.startsWith('EVENT_JSON:')) return false;
      const event = JSON.parse(line.slice('EVENT_JSON:'.length));
      return event.standard === 'nep171' && event.event === eventName && event.data.some((entry) =>
        entry.token_ids?.includes(tokenId) &&
        (eventName === 'nft_mint' ? entry.owner_id === ownerId :
          entry.old_owner_id === ownerId && entry.new_owner_id === receiverId));
    }));
}

const gift = await view('gift', { token_id: '0' });
const prize = await view('gift', { token_id: '1' });
const browserGift = await view('gift', { token_id: browserGiftId });
const [mintTx, transferTx] = await Promise.all([
  nearTx(browserMintTx, browserCreator), nearTx(browserTransferTx, browserCreator),
]);
assert.equal(browserGift.owner_id, recipient);
assert.equal(browserGift.redemption_started, false);
assert.equal(browserGift.title, 'Browser flow check · 11 Nov');
assert.equal(mintTx.transaction.signer_id, browserCreator);
assert.equal(transferTx.transaction.signer_id, browserCreator);
assertNearAction(mintTx, 'create_gift', {
  title: 'Browser flow check · 11 Nov',
  message: 'Created through the live PrizeKey browser app on NEAR testnet.',
}, '10000000000000000000000');
assertNearAction(transferTx, 'nft_transfer', {
  receiver_id: recipient, token_id: browserGiftId,
}, '1');
assert.equal(hasNftEvent(mintTx, 'nft_mint', browserGiftId, browserCreator), true);
assert.equal(hasNftEvent(transferTx, 'nft_transfer', browserGiftId, browserCreator, recipient), true);
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
const { address, publicKey } = await bitcoin.deriveAddressAndPublicKey(contract, 'prizekey-btc-v1-0');
assert.equal(address, 'tb1qlnh99fd5amupc6tf65gh8a7eu37ujl94dj0cht');
const { address: prizeAddress } = await bitcoin.deriveAddressAndPublicKey(contract, 'prizekey-btc-v1-1');
assert.equal(prizeAddress, 'tb1qtwwe5nlkzpnv3tj8rd5gn4wjrn6nejve3flhfm');

const [funding, payout, payoutStatus] = await Promise.all([
  json(`${btcApi}/tx/${fundingTxid}`), json(`${btcApi}/tx/${payoutTxid}`),
  json(`${btcApi}/tx/${payoutTxid}/status`),
]);
const rawResponse = await fetch(`${btcApi}/tx/${payoutTxid}/hex`);
assert.equal(rawResponse.ok, true, 'payout raw transaction unavailable');
const rawPayout = await rawResponse.text();
const tx = bitcoinjs.Transaction.fromHex(rawPayout);
assert.equal(tx.getId(), payoutTxid);
assert.equal(tx.ins.length, 1);
const scriptCode = bitcoinjs.payments.p2pkh({ pubkey: Buffer.from(publicKey, 'hex'),
  network: bitcoinjs.networks.testnet }).output;
assert.equal(tx.hashForWitnessV0(0, scriptCode, 100_000, bitcoinjs.Transaction.SIGHASH_ALL).toString('hex'),
  gift.last_payload_hex, 'NEAR-stored digest differs from Bitcoin payout sighash');
assert.equal(tx.ins[0].witness[1].toString('hex'), publicKey, 'Bitcoin witness key differs from derived gift key');
const witness = bitcoinjs.script.signature.decode(tx.ins[0].witness[0]);
assert.equal(witness.hashType, bitcoinjs.Transaction.SIGHASH_ALL);
const mpcSignature = JSON.parse(gift.last_signature);
assert.equal(witness.signature.subarray(0, 32).toString('hex'), mpcSignature.big_r.affine_point.slice(2),
  'Bitcoin witness r differs from MPC signature');
assert.equal(witness.signature.subarray(32).toString('hex'), mpcSignature.s.scalar,
  'Bitcoin witness s differs from MPC signature');
const [prizeUtxos, prizeStatus] = await Promise.all([
  json(`${btcApi}/address/${prizeAddress}/utxo`),
  json(`${btcApi}/tx/${prizeFundingTxid}/status`),
]);
assert.ok(prizeUtxos.some((u) => u.txid === prizeFundingTxid && u.value === 100_000), 'live prize funding missing');
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
  funding_confirmed: prizeStatus.confirmed,
  confirmed_block_height: prizeStatus.block_height ?? null }, null, 2));
console.log(JSON.stringify({ result: 'PASS', gift_id: browserGift.id, current_owner: browserGift.owner_id,
  browser_mint_txid: browserMintTx, browser_transfer_txid: browserTransferTx,
  scope: 'Final NEAR transactions and current gift state; browser interaction is documented by screenshot, not independently attested by RPC.' }, null, 2));
