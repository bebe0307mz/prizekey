export function parseGiftRoute(search) {
  const params = new URLSearchParams(search);
  const claim = params.has('claim');
  const raw = params.get(claim ? 'claim' : 'gift');
  const valid = raw != null && /^(0|[1-9]\d*)$/.test(raw) && Number.isSafeInteger(Number(raw));
  return { claim, id: raw == null && !claim ? 1 : valid ? Number(raw) : null };
}

export function recipientLink(locationHref, giftId) {
  if (!Number.isSafeInteger(giftId) || giftId < 0) throw new Error('Invalid gift');
  const url = new URL(locationHref);
  url.username = ''; url.password = '';
  url.search = `?claim=${giftId}`;
  url.hash = '';
  return { href: url.href, local: ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname) };
}

export async function loadGiftRows(view, { claim, id }, preferredId) {
  const target = preferredId ?? id;
  if (target == null) return [];
  if (claim) return [await view('gift', { token_id: String(target) })].filter(Boolean);
  const total = await view('total_gifts');
  const ids = Array.from({ length: Math.min(total, 24) }, (_, i) => total - 1 - i);
  // A recipient/deep link remains usable even after its gift leaves the recent list.
  if (!ids.includes(target)) ids.push(target);
  return (await Promise.all(ids.map((giftId) => view('gift', { token_id: String(giftId) })))).filter(Boolean);
}

export function claimStage({ gift, loading, error, account, balance, payout, canBroadcast }) {
  if (!gift) return loading ? 'loading' : error ? 'unavailable' : 'not-found';
  if (payout) return 'delivered';
  if (!account) return 'connect';
  if (gift.owner_id !== account) return 'wrong-account';
  if (gift.pending) return 'signing';
  if (canBroadcast) return 'ready-to-send';
  if (balance == null) return 'balance-loading';
  if (balance === 0) return 'unfunded';
  if (balance <= 796) return 'too-small';
  return 'choose-destination';
}

export function readPreparedClaim(raw, contract, gift, account) {
  try {
    const record = JSON.parse(raw);
    return record && record.contract === contract && record.tokenId === String(gift?.id) &&
      record.owner === gift?.owner_id && (!account || record.owner === account) &&
      /^[0-9a-f]{64}$/.test(record.payloadHex) ? record : null;
  } catch { return null; }
}
