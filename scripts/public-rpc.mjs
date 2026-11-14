import assert from 'node:assert/strict';

export const rpcEndpoints = [
  'https://rpc.testnet.near.org',
  'https://test.rpc.fastnear.com',
  'https://archival-rpc.testnet.near.org',
];

// Only public reads are accepted. No wallet, credentials or transaction submission.
export async function publicRpc(method, params) {
  assert.ok(['query', 'tx'].includes(method), 'public verifier only permits query and tx');
  const errors = [];
  for (const endpoint of rpcEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        signal: AbortSignal.timeout(12_000),
        body: JSON.stringify({ jsonrpc: '2.0', id: 'prizekey-public-read', method, params }),
      });
      assert.ok(response.ok, `HTTP ${response.status}`);
      const body = await response.json();
      assert.equal(body.error, undefined, JSON.stringify(body.error));
      assert.ok(body.result, 'RPC returned no result');
      return { result: body.result, endpoint };
    } catch (error) { errors.push(`${endpoint}: ${error.message}`); }
  }
  throw new Error(`All public NEAR reads failed: ${errors.join('; ')}`);
}

export async function publicFetch(url, type = 'json') {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  assert.ok(response.ok, `${url}: HTTP ${response.status}`);
  return type === 'text' ? response.text() : response.json();
}
