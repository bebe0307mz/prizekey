import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { utils } from 'chainsig.js';
import bitcoin from 'bitcoinjs-lib';
import { publicFetch, publicRpc } from './public-rpc.mjs';

const proof = JSON.parse(await readFile(new URL('../evidence/gift3-proof.json', import.meta.url)));
const api = 'https://mempool.space/testnet4/api';
const mpc = 'v1.signer-prod.testnet';
const reads = [];
const decode = (value) => JSON.parse(Buffer.from(value, 'base64').toString());

async function query(params) {
  const { result, endpoint } = await publicRpc('query', params);
  reads.push({ endpoint, method: 'query', params, blockHeight: result.block_height });
  return result;
}
async function view(account, method, args = {}) {
  const result = await query({ request_type: 'call_function', finality: 'final',
    account_id: account, method_name: method,
    args_base64: Buffer.from(JSON.stringify(args)).toString('base64') });
  return JSON.parse(Buffer.from(result.result).toString());
}
async function transaction(hash, signer) {
  const { result, endpoint } = await publicRpc('tx', [hash, signer]);
  reads.push({ endpoint, method: 'tx', hash, signer });
  assert.equal(result.transaction.hash, hash);
  assert.equal(result.transaction.signer_id, signer);
  assert.equal(result.final_execution_status, 'FINAL', `${hash}: not final`);
  assert.ok(result.status?.SuccessValue != null, `${hash}: execution failed`);
  assert.ok(result.receipts_outcome.every((r) => !r.outcome.status?.Failure), `${hash}: failed receipt`);
  return result;
}
function action(tx, receiver, method, args, deposit) {
  assert.equal(tx.transaction.receiver_id, receiver);
  assert.equal(tx.transaction.actions.length, 1);
  const call = tx.transaction.actions[0].FunctionCall;
  assert.equal(call.method_name, method);
  assert.deepEqual(decode(call.args), args);
  assert.equal(call.deposit, deposit);
}
function events(tx, executor) {
  return tx.receipts_outcome.filter((r) => r.outcome.executor_id === executor)
    .flatMap((r) => r.outcome.logs).filter((l) => l.startsWith('EVENT_JSON:'))
    .map((l) => JSON.parse(l.slice('EVENT_JSON:'.length)));
}
function verifyWitness(tx, publicKey, value, digest, signature) {
  assert.equal(tx.ins.length, 1);
  assert.equal(tx.ins[0].witness.length, 2);
  assert.equal(tx.ins[0].witness[1].toString('hex'), publicKey, 'Bitcoin witness derived key mismatch');
  const script = bitcoin.payments.p2pkh({ pubkey: Buffer.from(publicKey, 'hex'),
    network: bitcoin.networks.testnet }).output;
  const hash = tx.hashForWitnessV0(0, script, value, bitcoin.Transaction.SIGHASH_ALL).toString('hex');
  assert.equal(hash, digest, 'Bitcoin sighash differs from NEAR-authorized digest');
  const witness = bitcoin.script.signature.decode(tx.ins[0].witness[0]);
  assert.equal(witness.hashType, bitcoin.Transaction.SIGHASH_ALL);
  assert.equal(witness.signature.subarray(0, 32).toString('hex'), signature.big_r.affine_point.slice(2));
  assert.equal(witness.signature.subarray(32).toString('hex'), signature.s.scalar);
  return hash;
}

const [gift, preserved, rootKey, mint, transfer, authorization, fundingAuthorization,
  funding, payout, rawPayout, rawFunding, preservedUtxos, giftUtxos] = await Promise.all([
  view(proof.contract, 'gift', { token_id: proof.giftId }),
  view(proof.contract, 'gift', { token_id: proof.preservedGift.id }),
  view(mpc, 'public_key'),
  transaction(proof.near.mint, proof.creator),
  transaction(proof.near.transfer, proof.creator),
  transaction(proof.near.payoutSignature, proof.recipient),
  transaction(proof.near.fundingSignature, proof.creator),
  publicFetch(`${api}/tx/${proof.bitcoin.funding}`),
  publicFetch(`${api}/tx/${proof.bitcoin.payout}`),
  publicFetch(`${api}/tx/${proof.bitcoin.payout}/hex`, 'text'),
  publicFetch(`${api}/tx/${proof.bitcoin.funding}/hex`, 'text'),
  publicFetch(`${api}/address/${proof.preservedGift.address}/utxo`),
  publicFetch(`${api}/address/${proof.giftAddress}/utxo`),
]);

assert.equal(gift.id, Number(proof.giftId));
assert.equal(gift.owner_id, proof.recipient);
assert.equal(gift.title, proof.title);
assert.equal(gift.redemption_started, true);
assert.equal(gift.pending, false);
assert.match(gift.last_payload_hex, /^[0-9a-f]{64}$/);
assert.equal(typeof gift.last_signature, 'string');
assert.equal(preserved.owner_id, proof.creator);
assert.equal(preserved.redemption_started, false);
assert.equal(preserved.pending, false);
assert.ok(preservedUtxos.some((u) => u.txid === proof.preservedGift.funding &&
  u.value === proof.preservedGift.fundedSats), 'preserved gift #1 funding is absent');

action(mint, proof.contract, 'create_gift', { title: proof.title, message: proof.message }, '10000000000000000000000');
const minted = decode(mint.status.SuccessValue);
assert.equal(minted.id, Number(proof.giftId));
assert.equal(minted.owner_id, proof.creator);
action(transfer, proof.contract, 'nft_transfer', { receiver_id: proof.recipient, token_id: proof.giftId }, '1');
action(authorization, proof.contract, 'request_btc_signature', {
  token_id: proof.giftId, payload_hex: gift.last_payload_hex,
}, '0');
assert.equal(decode(authorization.status.SuccessValue), true);
assert.ok(events(mint, proof.contract).some((e) => e.standard === 'nep171' &&
  e.event === 'nft_mint' && e.data.some((d) => d.owner_id === proof.creator && d.token_ids.includes(proof.giftId))));
assert.ok(events(transfer, proof.contract).some((e) => e.standard === 'nep171' &&
  e.event === 'nft_transfer' && e.data.some((d) => d.old_owner_id === proof.creator &&
    d.new_owner_id === proof.recipient && d.token_ids.includes(proof.giftId))));
assert.ok(events(authorization, proof.contract).some((e) => e.standard === 'prizekey' &&
  e.event === 'btc_signature_ready' && e.data.token_id === proof.giftId &&
  e.data.payload_hex === gift.last_payload_hex));
assert.ok(authorization.receipts_outcome.some((r) => r.outcome.executor_id === mpc &&
  r.outcome.logs.some((l) => l.includes(`predecessor=AccountId("${proof.contract}")`) &&
    l.includes(`path: "prizekey-btc-v1-${proof.giftId}"`))), 'Gift-specific MPC signer receipt missing');

// Derive from the live public MPC root; no stored root or private key is used.
assert.match(rootKey, /^secp256k1:/);
const root = utils.cryptography.najToUncompressedPubKeySEC1(rootKey);
function derive(account, path) {
  const publicKey = utils.cryptography.compressPubKey(utils.cryptography.deriveChildPublicKey(root, account, path));
  const address = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(publicKey, 'hex'),
    network: bitcoin.networks.testnet }).address;
  return { publicKey, address };
}
const derived = derive(proof.contract, `prizekey-btc-v1-${proof.giftId}`);
assert.equal(derived.address, proof.giftAddress);
assert.equal(derive(proof.contract, `prizekey-btc-v1-${proof.preservedGift.id}`).address, proof.preservedGift.address);
assert.equal(funding.txid, proof.bitcoin.funding);
assert.equal(funding.vout[proof.bitcoin.fundingOutput].scriptpubkey_address, proof.giftAddress);
assert.equal(funding.vout[proof.bitcoin.fundingOutput].value, proof.fundedSats);
assert.equal(funding.fee, proof.fundingFeeSats);
assert.equal(payout.txid, proof.bitcoin.payout);
assert.equal(payout.vin.length, 1);
assert.equal(payout.vin[0].txid, proof.bitcoin.funding);
assert.equal(payout.vin[0].vout, proof.bitcoin.fundingOutput);
assert.equal(payout.vin[0].prevout.value, proof.fundedSats);
assert.equal(payout.vout.length, 1);
assert.equal(payout.vout[0].scriptpubkey_address, proof.destination);
assert.equal(payout.vout[0].value, proof.paidSats);
assert.equal(payout.fee, proof.payoutFeeSats);
assert.equal(proof.fundedSats - proof.paidSats, payout.fee);
const raw = bitcoin.Transaction.fromHex(rawPayout);
assert.equal(raw.getId(), proof.bitcoin.payout);
assert.equal(Buffer.from(raw.ins[0].hash).reverse().toString('hex'), proof.bitcoin.funding);
assert.equal(raw.ins[0].index, proof.bitcoin.fundingOutput);
assert.equal(raw.outs.length, 1);
assert.equal(raw.outs[0].value, proof.paidSats);
assert.equal(bitcoin.address.fromOutputScript(raw.outs[0].script, bitcoin.networks.testnet), proof.destination);
verifyWitness(raw, derived.publicKey, proof.fundedSats, gift.last_payload_hex, JSON.parse(gift.last_signature));

const rawFund = bitcoin.Transaction.fromHex(rawFunding);
assert.equal(rawFund.getId(), proof.bitcoin.funding);
assert.equal(funding.vin.length, 1);
const fundingKey = rawFund.ins[0].witness[1].toString('hex');
assert.equal(derive(proof.creator, 'probe-v1').publicKey, fundingKey, 'funding POC derivation mismatch');
const fundScript = bitcoin.payments.p2pkh({ pubkey: Buffer.from(fundingKey, 'hex'),
  network: bitcoin.networks.testnet }).output;
const fundingDigest = rawFund.hashForWitnessV0(0, fundScript, funding.vin[0].prevout.value,
  bitcoin.Transaction.SIGHASH_ALL).toString('hex');
action(fundingAuthorization, proof.creator, 'sign_probe', { payload_hex: fundingDigest }, '0');
assert.equal(decode(fundingAuthorization.status.SuccessValue), true);
const fundingSignatureLog = fundingAuthorization.receipts_outcome
  .filter((r) => r.outcome.executor_id === proof.creator).flatMap((r) => r.outcome.logs)
  .find((l) => l.startsWith('signature_ready:'));
assert.ok(fundingSignatureLog, 'Funding MPC signature callback log missing');
const fundingSignature = JSON.parse(fundingSignatureLog.slice('signature_ready:'.length));
verifyWitness(rawFund, fundingKey, funding.vin[0].prevout.value, fundingDigest, fundingSignature);
assert.equal(funding.vin[0].prevout.value, 769_000);
assert.equal(funding.vout.length, 2);
assert.equal(funding.vout[1].scriptpubkey_address, derive(proof.creator, 'probe-v1').address);
assert.equal(funding.vout[1].value, 748_750);

const result = {
  result: 'PASS', checkedAt: new Date().toISOString(), network: proof.network,
  scope: 'Public read-only verification of recorded Gift #3 execution; does not sign or broadcast.',
  giftId: proof.giftId, currentOwner: gift.owner_id, giftAddress: derived.address,
  rootKeySource: 'Live public_key view of v1.signer-prod.testnet',
  fundedSats: proof.fundedSats, paidSats: proof.paidSats, destination: proof.destination,
  fundingFeeSats: funding.fee, payoutFeeSats: payout.fee,
  payoutTxid: payout.txid, payoutConfirmed: payout.status.confirmed,
  confirmedBlockHeight: payout.status.block_height ?? null,
  confirmedBlockHash: payout.status.block_hash ?? null,
  confirmedBlockTime: payout.status.block_time ?? null,
  giftUnspentSats: giftUtxos.reduce((sum, u) => sum + u.value, 0),
  checks: ['Final NEAR mint and return value', 'Final NEAR transfer and NFT ownership events',
    'Recipient authorization and gift-specific MPC receipt/callback',
    'Live MPC root derivation of gift Bitcoin key/address',
    'Exact Bitcoin funding input, payout destination, amount and fees',
    'Raw Bitcoin payout sighash and witness match NEAR digest and MPC signature',
    'Funding MPC request and signature match raw funding transaction',
    'Gift #1 remains transferable and its 100,000-sat UTXO remains unspent'],
  preservedGift: { id: proof.preservedGift.id, owner: preserved.owner_id, transferable: true,
    unspentSats: preservedUtxos.reduce((sum, u) => sum + u.value, 0) },
  sources: { nearReads: reads, bitcoinApi: api,
    funding: `${api}/tx/${funding.txid}`, payout: `${api}/tx/${payout.txid}` },
  limitations: ['No live old-owner rejection transaction was sent for Gift #3. Owner gating has unit-test coverage.',
    'Confirmation status is a dated public observation and may change after a testnet reorganization.',
    'RPC verification proves chain records, while captured footage documents browser interaction.'],
};
if (process.argv.includes('--write')) {
  await writeFile(new URL('../evidence/gift3-verification.json', import.meta.url), `${JSON.stringify(result, null, 2)}\n`);
}
console.log(JSON.stringify(result, null, 2));
