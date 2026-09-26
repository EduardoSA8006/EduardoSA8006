// Card "Minhas estatísticas": totais públicos + privados (495×195).

import { card, theme } from './theme.js';
import { escapeXml, formatNumber, MONTHS } from './svg.js';

// Ícones 16×16 desenhados com traço (sem fontes nem recursos externos).
const ICONS = {
  calendar: '<rect x="1.5" y="2.5" width="13" height="12" rx="2"/><path d="M1.5 6.5h13M5 1v3M11 1v3"/>',
  lock: '<rect x="3" y="7" width="10" height="7.5" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>',
  commit: '<circle cx="8" cy="8" r="3"/><path d="M1.5 8H5M11 8h3.5"/>',
  pullRequest: '<circle cx="4" cy="3.5" r="1.8"/><circle cx="4" cy="12.5" r="1.8"/><circle cx="12" cy="12.5" r="1.8"/><path d="M4 5.3v5.4M12 10.7V6.5a2 2 0 0 0-2-2H7.5M9 3l-1.5 1.5L9 6"/>',
  issue: '<circle cx="8" cy="8" r="6.5"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/>',
  repo: '<path d="M3 13V2.8A1.3 1.3 0 0 1 4.3 1.5H13v10H4.3A1.3 1.3 0 0 0 3 12.8a1.3 1.3 0 0 0 1.3 1.2H13"/>',
};

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
