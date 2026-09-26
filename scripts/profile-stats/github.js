// Cliente GraphQL mínimo da API do GitHub (fetch nativo, sem dependências).

const ENDPOINT = 'https://api.github.com/graphql';

export function createClient({ token, fetchImpl = globalThis.fetch, endpoint = ENDPOINT }) {
  if (!token) throw new Error('Token do GitHub ausente.');

  return {
    async graphql(query, variables = {}) {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'profile-stats',
        },
        body: JSON.stringify({ query, variables }),
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`GitHub GraphQL respondeu HTTP ${response.status}: ${text.replace(/\s+/g, ' ').slice(0, 300)}`);
      }

      const body = JSON.parse(text);
      if (body.errors?.length) {
        const messages = body.errors.map((e) => e.message).join('; ');
        throw new Error(`GitHub GraphQL retornou erro: ${messages}`);
      }
      return body.data;
    },
  };
}

// Percorre uma conexão paginada. `fetchPage(after)` devolve { nodes, pageInfo }.
export async function paginate(fetchPage) {
  const nodes = [];
  let after = null;
  for (;;) {
    const page = await fetchPage(after);
    nodes.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) return nodes;
    after = page.pageInfo.endCursor;
  }
}
