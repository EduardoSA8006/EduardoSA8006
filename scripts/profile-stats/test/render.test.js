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
