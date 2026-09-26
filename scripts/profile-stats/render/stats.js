// Card "Minhas estatísticas": totais públicos + privados (495×195).

import { card, theme } from './theme.js';
import { escapeXml } from './svg.js';
import { messages } from './i18n.js';
import { ICONS } from './icons.js';

const ROWS = [
  ['calendar', 'lastYearContributions'],
  ['lock', 'privateContributions'],
  ['commit', 'commits'],
  ['pullRequest', 'pullRequests'],
  ['issue', 'issues'],
  ['repo', 'repositories'],
];

export function renderStats(stats, { locale } = {}) {
  const t = messages(locale);

  const rowsSvg = ROWS
    .map(([icon, key], i) => {
      const y = 66 + i * 22;
      return `  <g transform="translate(25 ${y - 12})" class="icon">${ICONS[icon]}</g>
  <text x="50" y="${y}" class="label">${escapeXml(t.stats.rows[key])}</text>
  <text x="305" y="${y}" class="value" text-anchor="end">${t.formatNumber(stats[key])}</text>`;
    })
    .join('\n');

  const total = t.formatNumber(stats.totalContributions);
  const ring = `  <circle cx="400" cy="96" r="46" stroke="url(#ring)" stroke-width="7"/>
  <text x="400" y="104" class="total" text-anchor="middle">${total}</text>
  <text x="400" y="165" class="caption" text-anchor="middle">${escapeXml(t.stats.total)}</text>
  <text x="400" y="182" class="since muted" text-anchor="middle">${escapeXml(t.since(stats.since))}</text>`;

  const css = `
    .label { font-size: 13.5px; fill: ${theme.text}; }
    .value { font-size: 13.5px; font-weight: 700; fill: ${theme.strong}; }
    .icon { fill: none; stroke: ${theme.accent}; color: ${theme.accent}; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
    .total { font-size: ${total.length > 6 ? 20 : 24}px; font-weight: 700; fill: ${theme.strong}; }
    .caption { font-size: 12.5px; fill: ${theme.text}; }
    .since { font-size: 11px; }`;

  const body = `  <defs>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.line}"/>
      <stop offset="1" stop-color="${theme.area}"/>
    </linearGradient>
  </defs>
  <text x="25" y="35" class="title">${escapeXml(t.stats.title)}</text>
${rowsSvg}
${ring}`;

  return card({
    width: 495,
    height: 195,
    label: t.stats.label(total),
    css,
    body,
  });
}
