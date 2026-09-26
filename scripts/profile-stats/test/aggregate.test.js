import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  yearWindows,
  summarizeContributions,
  calendarDays,
  mergeCalendarDays,
  longestStreak,
  peakDay,
  countLanguages,
  aggregateLanguages,
  levelProgress,
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

const week = (...days) => ({ contributionDays: days.map(([date, contributionCount]) => ({ date, contributionCount })) });

test('mergeCalendarDays: une os calendários das janelas em ordem e sem datas repetidas', () => {
  const days = mergeCalendarDays([
    { weeks: [week(['2025-11-10', 1], ['2025-11-11', 2])] },
    { weeks: [week(['2025-11-11', 2], ['2025-11-12', 5])] },
  ]);
  assert.deepEqual(days, [
    { date: '2025-11-10', count: 1 },
    { date: '2025-11-11', count: 2 },
    { date: '2025-11-12', count: 5 },
  ]);
});

test('mergeCalendarDays: data repetida com contagens diferentes fica com a maior', () => {
  const days = mergeCalendarDays([
    { weeks: [week(['2026-01-01', 3])] },
    { weeks: [week(['2026-01-01', 7])] },
  ]);
  assert.deepEqual(days, [{ date: '2026-01-01', count: 7 }]);
});

const day = (date, count) => ({ date, count });

test('longestStreak: sem dias ou só com zeros dá 0', () => {
  assert.equal(longestStreak([]), 0);
  assert.equal(longestStreak([day('2026-01-01', 0), day('2026-01-02', 0)]), 0);
});

test('longestStreak: dia com 0 contribuições quebra a sequência', () => {
  const days = [
    day('2026-01-01', 1), day('2026-01-02', 4), day('2026-01-03', 0),
    day('2026-01-04', 2), day('2026-01-05', 1), day('2026-01-06', 9), day('2026-01-07', 0),
  ];
  assert.equal(longestStreak(days), 3);
});

test('longestStreak: dia ausente também quebra a sequência', () => {
  assert.equal(longestStreak([day('2026-01-01', 1), day('2026-01-02', 1), day('2026-01-04', 1)]), 2);
});

test('longestStreak: sequência atravessa a virada entre duas janelas anuais', () => {
  const days = mergeCalendarDays([
    { weeks: [week(['2025-11-09', 0], ['2025-11-10', 1], ['2025-11-11', 3])] },
    { weeks: [week(['2025-11-12', 2], ['2025-11-13', 6], ['2025-11-14', 0])] },
  ]);
  assert.equal(longestStreak(days), 4);
});

test('longestStreak: atravessa virada de mês e de ano', () => {
  const days = [day('2025-12-30', 1), day('2025-12-31', 1), day('2026-01-01', 1), day('2026-01-02', 1)];
  assert.equal(longestStreak(days), 4);
});

test('peakDay: maior contagem diária, 0 sem dias', () => {
  assert.equal(peakDay([]), 0);
  assert.equal(peakDay([day('2025-01-01', 4), day('2026-03-02', 31), day('2026-03-03', 7)]), 31);
});

test('levelProgress: abaixo do 1º nível', () => {
  assert.deepEqual(levelProgress(40, [100, 500, 1000]), { level: 0, maxLevel: 3, next: 100, progress: 0.4 });
  assert.deepEqual(levelProgress(0, [100, 500, 1000]), { level: 0, maxLevel: 3, next: 100, progress: 0 });
});

test('levelProgress: exatamente no limiar sobe de nível com progresso zerado', () => {
  assert.deepEqual(levelProgress(100, [100, 500, 1000]), { level: 1, maxLevel: 3, next: 500, progress: 0 });
});

test('levelProgress: entre níveis mede o progresso a partir do limiar atual', () => {
  assert.deepEqual(levelProgress(300, [100, 500, 1000]), { level: 1, maxLevel: 3, next: 500, progress: 0.5 });
});

test('levelProgress: no nível máximo e acima dele a barra fica cheia', () => {
  const max = { level: 3, maxLevel: 3, next: null, progress: 1 };
  assert.deepEqual(levelProgress(1000, [100, 500, 1000]), max);
  assert.deepEqual(levelProgress(4321, [100, 500, 1000]), max);
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

test('countLanguages: conta linguagens distintas antes de agrupar em "Outras"', () => {
  const repos = [
    repo('a', [['Dart', 600, '#00B4AB'], ['Python', 100, '#3572A5'], ['Vazia', 0, '#000000']]),
    repo('b', [['Python', 300, '#3572A5'], ['Kotlin', 5, '#A97BFF'], ['Swift', 1, '#F05138']]),
  ];
  assert.equal(countLanguages(repos), 4);
  assert.equal(aggregateLanguages(repos, { limit: 2 }).length, 2);
  assert.equal(countLanguages([]), 0);
});
