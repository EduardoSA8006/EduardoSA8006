import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderStats } from '../render/stats.js';
import { renderActivity } from '../render/activity.js';
import { renderLanguages } from '../render/languages.js';
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
