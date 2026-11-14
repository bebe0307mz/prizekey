import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGiftRoute, recipientLink, loadGiftRows, claimStage, readPreparedClaim } from '../src/claim-state.mjs';

test('an old direct gift link is read even outside the latest 24 gifts', async () => {
  const requested = [];
  const view = async (method, args) => {
    if (method === 'total_gifts') return 50;
    requested.push(Number(args.token_id));
    return { id: Number(args.token_id), owner_id: 'holder.testnet' };
  };
  const rows = await loadGiftRows(view, parseGiftRoute('?gift=0'));
  assert.equal(rows.find((gift) => gift.id === 0)?.owner_id, 'holder.testnet');
  assert.equal(requested.length, 25);
  assert.equal(requested.filter((id) => id === 0).length, 1);
});

test('recipient routes request exactly their gift, including missing gifts', async () => {
  const calls = [];
  const view = async (method, args) => { calls.push([method, args]); return null; };
  assert.deepEqual(await loadGiftRows(view, parseGiftRoute('?claim=2')), []);
  assert.deepEqual(calls, [['gift', { token_id: '2' }]]);
  await loadGiftRows(view, parseGiftRoute('?claim=2oops'));
  assert.equal(calls.length, 1);
});

test('invalid and ambiguous IDs never fall through to another gift', () => {
  for (const raw of ['-1', '01', '1.5', 'foo', '9007199254740992', '']) assert.equal(parseGiftRoute(`?claim=${raw}`).id, null);
  assert.equal(parseGiftRoute('?claim=0').id, 0);
  assert.equal(parseGiftRoute('?gift=4&claim=2').id, 2);
});

test('recipient links retain the actual hosting path without ownership or a bearer secret', () => {
  assert.deepEqual(recipientLink('http://127.0.0.1:4175/?gift=3#manage', 3), { href: 'http://127.0.0.1:4175/?claim=3', local: true });
  assert.deepEqual(recipientLink('https://example.com/prizekey/?gift=3#manage', 3), { href: 'https://example.com/prizekey/?claim=3', local: false });
});

test('a link and cached approval cannot let the wrong account redeem', () => {
  const gift = { id: 2, owner_id: 'winner.testnet', pending: false };
  const state = { gift, balance: 20000, account: 'other.testnet', canBroadcast: true };
  assert.equal(claimStage(state), 'wrong-account');
  assert.equal(claimStage({ ...state, account: '' }), 'connect');
  assert.equal(claimStage({ ...state, account: gift.owner_id, canBroadcast: false }), 'choose-destination');
  assert.equal(claimStage({ ...state, account: gift.owner_id, gift: { ...gift, pending: true } }), 'signing');
  const raw = JSON.stringify({ contract: 'gift.testnet', tokenId: '2', owner: gift.owner_id, payloadHex: 'ab'.repeat(32) });
  assert.equal(readPreparedClaim(raw, 'gift.testnet', gift, 'other.testnet'), null);
  assert.equal(readPreparedClaim(raw, 'other.testnet', gift, gift.owner_id), null);
  assert.equal(readPreparedClaim('{bad json', 'gift.testnet', gift, gift.owner_id), null);
});

test('unknown balances and merely initiated redemptions are not called delivered', () => {
  const state = { gift: { owner_id: 'winner.testnet', pending: false, redemption_started: true }, account: 'winner.testnet', balance: null };
  assert.equal(claimStage(state), 'balance-loading');
  assert.equal(claimStage({ ...state, balance: 0 }), 'unfunded');
  assert.equal(claimStage({ ...state, balance: 796 }), 'too-small');
  assert.equal(claimStage({ ...state, balance: 797 }), 'choose-destination');
  assert.equal(claimStage({ ...state, payout: { amount: 19750, confirmed: true } }), 'delivered');
});
