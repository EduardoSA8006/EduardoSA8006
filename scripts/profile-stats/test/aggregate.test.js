import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  yearWindows,
  summarizeContributions,
  calendarDays,
  aggregateLanguages,
} from '../aggregate.js';

test('yearWindows: uma janela quando a conta tem menos de 1 ano', () => {
  const windows = yearWindows('2026-03-10T15:20:00Z', new Date('2026-09-26T12:00:00Z'));
  assert.deepEqual(windows, [
    { from: '2026-03-10T00:00:00.000Z', to: '2026-09-26T12:00:00.000Z' },
  ]);
});

test('yearWindows: janelas contíguas de no máximo 1 ano desde a criação', () => {
  const windows = yearWindows('2024-11-12T23:12:21Z', new Date('2026-09-26T12:00:00Z'));
  assert.deepEqual(windows, [
    { from: '2024-11-12T00:00:00.000Z', to: '2025-11-11T23:59:59.999Z' },
    { from: '2025-11-12T00:00:00.000Z', to: '2026-09-26T12:00:00.000Z' },
  ]);
  for (const { from, to } of windows) {
    const span = new Date(to) - new Date(from);
    assert.ok(span < 366 * 24 * 3600 * 1000, 'janela excede 1 ano');
  }
});

test('yearWindows: exatamente 2 anos gera 2 janelas sem sobreposição', () => {
  const windows = yearWindows('2024-01-01T00:00:00Z', new Date('2026-01-01T00:00:00Z'));
  assert.equal(windows.length, 2);
  assert.equal(windows[1].from, '2025-01-01T00:00:00.000Z');
  assert.equal(windows[1].to, '2025-12-31T23:59:59.999Z');
});

test('summarizeContributions: soma todas as janelas', () => {
  const collection = (total, restricted, commits, prs, issues) => ({
    restrictedContributionsCount: restricted,
    totalCommitContributions: commits,
    totalPullRequestContributions: prs,
    totalIssueContributions: issues,
    contributionCalendar: { totalContributions: total },
  });
  const summary = summarizeContributions([
    collection(800, 600, 90, 10, 1),
    collection(2743, 2379, 304, 45, 0),
  ]);
  assert.deepEqual(summary, {
    totalContributions: 3543,
    privateContributions: 2979,
    commits: 394,
    pullRequests: 55,
    issues: 1,
  });
});

test('summarizeContributions: lista vazia dá zeros', () => {
  assert.deepEqual(summarizeContributions([]), {
    totalContributions: 0,
    privateContributions: 0,
    commits: 0,
    pullRequests: 0,
    issues: 0,
  });
});

test('calendarDays: achata as semanas em dias ordenados por data', () => {
  const days = calendarDays({
    weeks: [
      { contributionDays: [{ date: '2026-01-05', contributionCount: 3 }] },
      {
        contributionDays: [
          { date: '2026-01-07', contributionCount: 0 },
          { date: '2026-01-06', contributionCount: 9 },
        ],
      },
    ],
  });
  assert.deepEqual(days, [
    { date: '2026-01-05', count: 3 },
    { date: '2026-01-06', count: 9 },
    { date: '2026-01-07', count: 0 },
  ]);
});

const repo = (name, langs) => ({
  name,
  description: `descrição de ${name}`,
  languages: {
    edges: langs.map(([lang, size, color]) => ({ size, node: { name: lang, color } })),
  },
});

test('aggregateLanguages: soma bytes por linguagem e calcula porcentagem', () => {
  const result = aggregateLanguages([
    repo('a', [['Dart', 600, '#00B4AB'], ['Python', 100, '#3572A5']]),
    repo('b', [['Python', 300, '#3572A5']]),
  ]);
  assert.deepEqual(result, [
    { name: 'Dart', color: '#00B4AB', size: 600, percent: 60 },
    { name: 'Python', color: '#3572A5', size: 400, percent: 40 },
  ]);
});

test('aggregateLanguages: agrupa o excedente em "Outras" mantendo o limite', () => {
  const langs = ['A', 'B', 'C', 'D', 'E'].map((n, i) => [n, 50 - i * 10, '#111111']);
  const result = aggregateLanguages([repo('x', langs)], { limit: 3 });
  assert.equal(result.length, 3);
  assert.deepEqual(result.map((l) => l.name), ['A', 'B', 'Outras']);
  const outras = result[2];
  assert.equal(outras.size, 30 + 20 + 10);
  assert.equal(outras.percent, (60 / 150) * 100);
  const sum = result.reduce((acc, l) => acc + l.percent, 0);
  assert.ok(Math.abs(sum - 100) < 1e-9);
});

test('aggregateLanguages: sem excedente não cria "Outras"', () => {
  const result = aggregateLanguages([repo('x', [['A', 1, '#1'], ['B', 1, '#2']])], { limit: 2 });
  assert.deepEqual(result.map((l) => l.name), ['A', 'B']);
});

test('aggregateLanguages: cor ausente recebe cor padrão', () => {
  const [lang] = aggregateLanguages([repo('x', [['Jinja', 10, null]])]);
  assert.match(lang.color, /^#[0-9a-fA-F]{6}$/);
});

test('aggregateLanguages: sem dados retorna lista vazia', () => {
  assert.deepEqual(aggregateLanguages([]), []);
  assert.deepEqual(aggregateLanguages([repo('x', [])]), []);
});

test('aggregateLanguages: resultado não carrega nome nem descrição de repositório', () => {
  const result = aggregateLanguages([
    repo('projeto-secreto-cliente', [['Kotlin', 100, '#A97BFF']]),
  ]);
  const json = JSON.stringify(result);
  assert.ok(!json.includes('projeto-secreto-cliente'));
  assert.ok(!json.includes('descrição'));
});
