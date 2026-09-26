// Card "Minhas estatísticas": totais públicos + privados (495×195).

import { card, theme } from './theme.js';
import { escapeXml, formatNumber, MONTHS } from './svg.js';
import { ICONS } from './icons.js';

function sinceLabel(iso) {
  const date = new Date(iso);
  return `desde ${MONTHS[date.getUTCMonth()]}/${date.getUTCFullYear()}`;
}

export function renderStats(stats) {
  const rows = [
    ['calendar', 'Contribuições no último ano', stats.lastYearContributions],
    ['lock', 'Contribuições privadas', stats.privateContributions],
    ['commit', 'Commits públicos', stats.commits],
    ['pullRequest', 'PRs públicos', stats.pullRequests],
    ['issue', 'Issues públicas', stats.issues],
    ['repo', 'Repositórios públicos', stats.repositories],
  ];

  const rowsSvg = rows
    .map(([icon, label, value], i) => {
      const y = 66 + i * 22;
      return `  <g transform="translate(25 ${y - 12})" class="icon">${ICONS[icon]}</g>
  <text x="50" y="${y}" class="label">${escapeXml(label)}</text>
  <text x="305" y="${y}" class="value" text-anchor="end">${formatNumber(value)}</text>`;
    })
    .join('\n');

  const total = formatNumber(stats.totalContributions);
  const ring = `  <circle cx="400" cy="96" r="46" stroke="url(#ring)" stroke-width="7"/>
  <text x="400" y="104" class="total" text-anchor="middle">${total}</text>
  <text x="400" y="165" class="caption" text-anchor="middle">contribuições totais</text>
  <text x="400" y="182" class="since muted" text-anchor="middle">${escapeXml(sinceLabel(stats.since))}</text>`;

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
  <text x="25" y="35" class="title">Minhas estatísticas</text>
${rowsSvg}
${ring}`;

  return card({
    width: 495,
    height: 195,
    label: `Estatísticas do GitHub: ${total} contribuições totais, incluindo privadas`,
    css,
    body,
  });
}
