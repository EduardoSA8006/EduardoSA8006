import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient, paginate } from '../github.js';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('createClient: envia query, variáveis e token e devolve data', async () => {
  let captured;
  const client = createClient({
    token: 'abc',
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return jsonResponse({ data: { ok: 1 } });
    },
  });
  const data = await client.graphql('query { ok }', { a: 1 });
  assert.deepEqual(data, { ok: 1 });
  assert.equal(captured.url, 'https://api.github.com/graphql');
  assert.equal(captured.init.method, 'POST');
  assert.equal(captured.init.headers.Authorization, 'bearer abc');
  assert.deepEqual(JSON.parse(captured.init.body), { query: 'query { ok }', variables: { a: 1 } });
});

test('createClient: exige token', () => {
  assert.throws(() => createClient({ token: '' }), /token/i);
});

test('createClient: HTTP de erro vira exceção', async () => {
  const client = createClient({ token: 't', fetchImpl: async () => jsonResponse({ message: 'Bad credentials' }, 401) });
  await assert.rejects(client.graphql('query { x }'), /401/);
});

test('createClient: "errors" do GraphQL vira exceção', async () => {
  const client = createClient({
    token: 't',
    fetchImpl: async () => jsonResponse({ data: null, errors: [{ message: 'Field x missing' }] }),
  });
  await assert.rejects(client.graphql('query { x }'), /Field x missing/);
});

test('paginate: segue o cursor até o fim e concatena os nós', async () => {
  const pages = {
    null: { nodes: [1, 2], pageInfo: { hasNextPage: true, endCursor: 'c1' } },
    c1: { nodes: [3], pageInfo: { hasNextPage: false, endCursor: 'c2' } },
  };
  const seen = [];
  const nodes = await paginate(async (after) => {
    seen.push(after);
    return pages[after];
  });
  assert.deepEqual(nodes, [1, 2, 3]);
  assert.deepEqual(seen, [null, 'c1']);
});
