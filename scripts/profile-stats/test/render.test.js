import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderStats } from '../render/stats.js';
import { renderActivity } from '../render/activity.js';
import { renderLanguages } from '../render/languages.js';
import { renderAchievements } from '../render/achievements.js';
import { theme } from '../render/theme.js';
import { assertWellFormedSvg } from './helpers.js';

const stats = {
  totalContributions: 3543,
  lastYearContributions: 2743,
  privateContributions: 2979,
  commits: 394,
  pullRequests: 55,
  issues: 1,
  repositories: 25,
  since: '2024-11-12T23:12:21Z',
};

test('renderStats: SVG válido 495×195 com todos os valores em pt-BR', () => {
  const svg = renderStats(stats);
  assertWellFormedSvg(svg);
  assert.match(svg, /viewBox="0 0 495 195"/);
  for (const value of ['3.543', '2.743', '2.979', '394', '55', '25']) {
    assert.ok(svg.includes(`>${value}<`), `valor ${value} ausente`);
  }
  assert.ok(svg.includes('>1<'));
  assert.match(svg, /contribuições totais/i);
  assert.match(svg, /Commits públicos/);
  assert.match(svg, /nov\/2024/);
});

test('renderStats: números com privados são rotulados como contribuições, não commits', () => {
  const svg = renderStats(stats);
  const labels = [...svg.matchAll(/<text[^>]*class="label"[^>]*>([^<]+)</g)].map((m) => m[1]);
  const commitLabels = labels.filter((l) => /commit/i.test(l));
  assert.deepEqual(commitLabels, ['Commits públicos']);
});

const days = Array.from({ length: 365 }, (_, i) => {
  const date = new Date(Date.UTC(2025, 8, 27) + i * 86400000).toISOString().slice(0, 10);
  return { date, count: (i * 7) % 23 };
});

test('renderActivity: SVG válido largo com título, área, linha e meses', () => {
  const svg = renderActivity(days);
  assertWellFormedSvg(svg);
  assert.match(svg, /viewBox="0 0 1200 300"/);
  assert.ok(svg.includes('Contribuições · último ano'));
  assert.match(svg, /<path[^>]*class="area"/);
  assert.match(svg, /<path[^>]*class="line"/);
  for (const month of ['out', 'jan', 'set']) assert.ok(svg.includes(`>${month}<`), `mês ${month} ausente`);
});

test('renderActivity: suporta calendário vazio ou zerado', () => {
  assertWellFormedSvg(renderActivity([]));
  assertWellFormedSvg(renderActivity(days.map((d) => ({ ...d, count: 0 }))));
});

const languages = [
  { name: 'Python', color: '#3572A5', size: 448, percent: 44.8 },
  { name: 'Dart', color: '#00B4AB', size: 248, percent: 24.8 },
  { name: 'C<&>', color: '#555555', size: 200, percent: 20 },
  { name: 'Outras', color: '#64748b', size: 104, percent: 10.4 },
];

test('renderLanguages: SVG válido 495×195 com barra e legenda', () => {
  const svg = renderLanguages(languages);
  assertWellFormedSvg(svg);
  assert.match(svg, /viewBox="0 0 495 195"/);
  assert.ok(svg.includes('Python'));
  assert.ok(svg.includes('44,8%'));
  assert.ok(svg.includes('C&lt;&amp;&gt;'));
  assert.ok(svg.includes('fill="#00B4AB"'));
  assert.equal((svg.match(/class="segment"/g) ?? []).length, languages.length);
});

test('renderLanguages: lista vazia mostra aviso', () => {
  const svg = renderLanguages([]);
  assertWellFormedSvg(svg);
  assert.match(svg, /Sem dados/);
});

test('renderLanguages: cor inválida não é injetada no SVG', () => {
  const svg = renderLanguages([{ name: 'X', color: '"/><script>', size: 1, percent: 100 }]);
  assertWellFormedSvg(svg);
});

const records = {
  totalContributions: 3543,
  longestStreak: 38,
  peakDay: 212,
  pullRequests: 55,
  languageCount: 9,
  repositories: 3,
};

test('renderAchievements: SVG válido com as 6 conquistas, valores em pt-BR e níveis', () => {
  const svg = renderAchievements(records);
  assertWellFormedSvg(svg);
  assert.match(svg, /viewBox="0 0 990 260"/);
  assert.match(svg, />Conquistas</);
  for (const title of ['Contribuições totais', 'Maior sequência de dias', 'Pico em um dia', 'PRs públicos', 'Linguagens usadas', 'Repositórios públicos']) {
    assert.ok(svg.includes(`>${title}<`), `conquista ${title} ausente`);
  }
  for (const value of ['3.543', '38', '212', '55', '9', '3']) {
    assert.ok(svg.includes(`>${value}<`), `valor ${value} ausente`);
  }
  // 3.543 → nível 4/5; 38 dias → 2/4; 212 → 4/4 (máximo); 55 → 2/4; 9 → 2/4; 3 → 0/4.
  for (const level of ['Nível 4/5', 'Nível 2/4', 'Nível 4/4', 'Nível 0/4']) {
    assert.ok(svg.includes(`>${level}<`), `${level} ausente`);
  }
  assert.equal((svg.match(/class="progress"/g) ?? []).length, 6);
  assert.match(svg, /nível máximo/);
  assert.ok(svg.includes('5.000'), 'próximo limiar da conquista de contribuições ausente');
});

test('renderAchievements: nível máximo tem barra cheia e cor mais forte da escala', () => {
  const widths = (svg, cls) =>
    [...svg.matchAll(new RegExp(`<rect class="${cls}"[^>]*width="([\\d.]+)"`, 'g'))].map((m) => Number(m[1]));
  const below = renderAchievements({ ...records, peakDay: 150 });
  assert.ok(widths(below, 'progress')[2] < widths(below, 'track')[2]);
  assert.doesNotMatch(below, /nível máximo/);

  const svg = renderAchievements({ ...records, peakDay: 999 });
  assert.equal(widths(svg, 'progress')[2], widths(svg, 'track')[2]);
  assert.ok(svg.includes(`fill="${theme.levels.at(-1)}"`), 'nível máximo sem a cor mais forte');
  assert.equal((svg.match(/nível máximo/g) ?? []).length, 1);
});

test('renderAchievements: zerado é válido e sem barra de progresso', () => {
  const zero = Object.fromEntries(Object.keys(records).map((k) => [k, 0]));
  const svg = renderAchievements(zero);
  assertWellFormedSvg(svg);
  assert.equal((svg.match(/>Nível 0\/\d</g) ?? []).length, 6);
  const bars = [...svg.matchAll(/<rect class="progress"[^>]*width="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.ok(bars.every((w) => w === 0));
});

test('renderAchievements: nenhum nome ou descrição de repositório chega ao SVG', () => {
  const svg = renderAchievements({ ...records, name: 'projeto-secreto-cliente', description: 'descrição sigilosa' });
  assert.ok(!svg.includes('projeto-secreto-cliente'));
  assert.ok(!svg.includes('sigilosa'));
});

// ── Inglês ────────────────────────────────────────────────────────────────

// Rótulos em português que não podem aparecer nos cards em inglês.
const PT_WORDS = /Contribuições|contribuições|públic|Repositórios|estatísticas|Linguagens|Conquistas|Nível|nível|próximo|dias|desde|pico|último|Outras|Sem dados/;

test('renderStats (en): textos em inglês e números en-US', () => {
  const svg = renderStats(stats, { locale: 'en' });
  assertWellFormedSvg(svg);
  assert.match(svg, /viewBox="0 0 495 195"/);
  for (const value of ['3,543', '2,743', '2,979', '394', '55', '25']) {
    assert.ok(svg.includes(`>${value}<`), `valor ${value} ausente`);
  }
  for (const text of ['My stats', 'Contributions in the last year', 'Private contributions', 'Public commits', 'Public PRs', 'Public issues', 'Public repositories', 'total contributions', 'since Nov 2024']) {
    assert.ok(svg.includes(`>${text}<`), `texto ${text} ausente`);
  }
  assert.doesNotMatch(svg, PT_WORDS);
});

test('renderActivity (en): título, resumo e meses em inglês', () => {
  const svg = renderActivity(days, { locale: 'en' });
  assertWellFormedSvg(svg);
  assert.ok(svg.includes('>Contributions · last year<'));
  const total = days.reduce((acc, d) => acc + d.count, 0);
  assert.ok(total >= 1000);
  assert.ok(svg.includes(`>${total.toLocaleString('en-US')} contributions · peak of 22 in a day<`));
  for (const month of ['Oct', 'Jan', 'Sep']) assert.ok(svg.includes(`>${month}<`), `mês ${month} ausente`);
  assert.doesNotMatch(svg, PT_WORDS);
  assert.doesNotMatch(renderActivity([], { locale: 'en' }), PT_WORDS);
});

test('renderLanguages (en): título, "Other" e percentuais en-US', () => {
  const svg = renderLanguages(languages, { locale: 'en' });
  assertWellFormedSvg(svg);
  assert.ok(svg.includes('>Most used languages<'));
  assert.ok(svg.includes('44.8%'));
  assert.ok(svg.includes('>Other <tspan'));
  assert.doesNotMatch(svg, PT_WORDS);
  assert.doesNotMatch(renderLanguages([], { locale: 'en' }), PT_WORDS);
});

test('renderAchievements (en): conquistas, níveis e legendas em inglês', () => {
  const svg = renderAchievements(records, { locale: 'en' });
  assertWellFormedSvg(svg);
  assert.match(svg, />Achievements</);
  for (const title of ['Total contributions', 'Longest streak', 'Peak in a day', 'Public PRs', 'Languages used', 'Public repositories']) {
    assert.ok(svg.includes(`>${title}<`), `conquista ${title} ausente`);
  }
  for (const level of ['Level 4/5', 'Level 2/4', 'Level 4/4', 'Level 0/4']) {
    assert.ok(svg.includes(`>${level}<`), `${level} ausente`);
  }
  assert.ok(svg.includes('>3,543<'));
  assert.ok(svg.includes('>next level: 5,000<'));
  assert.ok(svg.includes('>next level: 100 days<'));
  assert.ok(svg.includes('>days</tspan>'));
  assert.match(svg, />max level</);
  assert.doesNotMatch(svg, PT_WORDS);
});

test('singular: 1 dia/contribuição em pt-BR e 1 day/contribution em inglês', () => {
  const oneDay = [{ date: '2026-09-26', count: 1 }];
  assert.match(renderActivity(oneDay, { locale: 'en' }), />1 contribution · peak of 1 in a day</);
  assert.match(renderActivity(oneDay), />1 contribuição · pico de 1 em um dia</);
  const one = { ...records, longestStreak: 1 };
  assert.match(renderAchievements(one, { locale: 'en' }), />day<\/tspan>/);
  assert.match(renderAchievements(one, { locale: 'en' }), /next level: 7 days/);
  assert.match(renderAchievements(one), />dia<\/tspan>/);
});
