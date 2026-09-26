import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectContributions, collectLanguages, collectLanguagesWithFallback } from '../collect.js';

const collection = (total, restricted, days = []) => ({
  restrictedContributionsCount: restricted,
  totalCommitContributions: 10,
  totalPullRequestContributions: 2,
  totalIssueContributions: 1,
  contributionCalendar: {
    totalContributions: total,
    weeks: [{ contributionDays: days.map(([date, contributionCount]) => ({ date, contributionCount })) }],
  },
});

// Janela 1 termina em 2025-11-11 e a janela 2 começa em 2025-11-12: a sequência
// de 4 dias atravessa a virada; o pico (12) está na primeira janela.
const windowDays = {
  '2024-11-12T00:00:00.000Z': [['2025-11-01', 12], ['2025-11-02', 0], ['2025-11-10', 1], ['2025-11-11', 3]],
  '2025-11-12T00:00:00.000Z': [['2025-11-12', 2], ['2025-11-13', 1], ['2025-11-14', 0]],
};

test('collectContributions: soma janelas anuais e expõe o último ano e o calendário', async () => {
  const calls = [];
  const client = {
    async graphql(query, variables) {
      calls.push({ query, variables });
      if (variables.from) return { user: { contributionsCollection: collection(100, 60, windowDays[variables.from]) } };
      return {
        user: {
          createdAt: '2024-11-12T23:12:21Z',
          repositories: { totalCount: 25 },
          contributionsCollection: {
            contributionCalendar: {
              totalContributions: 2743,
              weeks: [{ contributionDays: [{ date: '2026-09-26', contributionCount: 7 }] }],
            },
          },
        },
      };
    },
  };

  const result = await collectContributions(client, 'EduardoSA8006', new Date('2026-09-26T12:00:00Z'));

  const windowCalls = calls.filter((c) => c.variables.from);
  assert.equal(windowCalls.length, 2);
  assert.ok(windowCalls.every((c) => c.variables.login === 'EduardoSA8006'));
  assert.deepEqual(result.stats, {
    totalContributions: 200,
    privateContributions: 120,
    commits: 20,
    pullRequests: 4,
    issues: 2,
    lastYearContributions: 2743,
    repositories: 25,
    since: '2024-11-12T23:12:21Z',
    longestStreak: 4,
    peakDay: 12,
  });
  assert.deepEqual(result.days, [{ date: '2026-09-26', count: 7 }]);
  for (const { query } of windowCalls) {
    assert.match(query, /contributionDays\s*\{\s*date\s+contributionCount\s*\}/);
    assert.doesNotMatch(query, /\bname\b|description|nameWithOwner|url/);
  }
});

test('collectContributions: usuário inexistente vira erro', async () => {
  const client = { graphql: async () => ({ user: null }) };
  await assert.rejects(collectContributions(client, 'ninguem'), /ninguem/);
});

test('collectLanguages: pagina repositórios e não pede nome/descrição', async () => {
  const queries = [];
  const page = (after, langs, next) => ({
    user: {
      repositories: {
        nodes: [{ languages: { edges: langs.map(([name, size]) => ({ size, node: { name, color: '#123456' } })) } }],
        pageInfo: { hasNextPage: Boolean(next), endCursor: next },
      },
    },
  });
  const client = {
    async graphql(query, variables) {
      queries.push(query);
      return variables.after ? page('c1', [['Python', 100]], null) : page(null, [['Dart', 300]], 'c1');
    },
  };
  const { languages: langs, languageCount } = await collectLanguages(client, 'EduardoSA8006');
  assert.deepEqual(langs.map((l) => [l.name, l.percent]), [['Dart', 75], ['Python', 25]]);
  assert.equal(languageCount, 2);
  for (const q of queries) {
    assert.doesNotMatch(q, /\bname\b(?!\s+color)/, 'query só pode pedir name da linguagem');
    assert.doesNotMatch(q, /description|nameWithOwner|url/);
    assert.match(q, /isFork:\s*false/);
    assert.match(q, /ownerAffiliations:\s*OWNER/);
  }
});

const reposPage = (langs) => ({
  user: {
    repositories: {
      nodes: [{ languages: { edges: langs.map(([name, size]) => ({ size, node: { name, color: '#123456' } })) } }],
      pageInfo: { hasNextPage: false, endCursor: null },
    },
  },
});

test('collectLanguagesWithFallback: mesmo cliente não tenta duas vezes', async () => {
  let calls = 0;
  const client = {
    async graphql() {
      calls += 1;
      return reposPage([['Python', 100]]);
    },
  };
  const { languages: langs } = await collectLanguagesWithFallback(client, client, 'EduardoSA8006');
  assert.deepEqual(langs.map((l) => l.name), ['Python']);
  assert.equal(calls, 1);
});

test('collectLanguagesWithFallback: erro de autenticação no LANGS_TOKEN cai para o GITHUB_TOKEN com aviso', async () => {
  const logs = [];
  const originalLog = console.log;
  console.log = (msg) => logs.push(msg);
  try {
    const langsClient = { graphql: async () => { throw new Error('GitHub GraphQL respondeu HTTP 401: Bad credentials'); } };
    const fallbackClient = { graphql: async () => reposPage([['Dart', 50]]) };

    const { languages: langs } = await collectLanguagesWithFallback(langsClient, fallbackClient, 'EduardoSA8006');

    assert.deepEqual(langs.map((l) => l.name), ['Dart']);
    assert.equal(logs.length, 1);
    assert.match(logs[0], /^::warning::/);
    assert.doesNotMatch(logs[0], /401|Bad credentials/);
  } finally {
    console.log = originalLog;
  }
});

test('collectLanguagesWithFallback: erro sem relação a autenticação propaga sem tentar o fallback', async () => {
  let fallbackCalled = false;
  const langsClient = { graphql: async () => { throw new Error('GitHub GraphQL respondeu HTTP 502: Bad Gateway'); } };
  const fallbackClient = { graphql: async () => { fallbackCalled = true; return reposPage([]); } };

  await assert.rejects(
    collectLanguagesWithFallback(langsClient, fallbackClient, 'EduardoSA8006'),
    /502/,
  );
  assert.equal(fallbackCalled, false);
});
