// Gráfico de área das contribuições diárias do último ano (1200×300).

import { card, theme } from './theme.js';
import { formatNumber, niceCeil, round, MONTHS } from './svg.js';

const WIDTH = 1200;
const HEIGHT = 300;
const PLOT = { left: 70, right: 1170, top: 78, bottom: 252 };
const TITLE = 'Contribuições · último ano';

export function renderActivity(days) {
  const counts = days.map((d) => d.count);
  const total = counts.reduce((acc, n) => acc + n, 0);
  const peak = counts.length ? Math.max(...counts) : 0;
  const yMax = niceCeil(peak);

  const plotW = PLOT.right - PLOT.left;
  const plotH = PLOT.bottom - PLOT.top;
  const x = (i) => PLOT.left + (days.length > 1 ? (i / (days.length - 1)) * plotW : plotW / 2);
  const y = (n) => PLOT.bottom - (n / yMax) * plotH;

  const grid = [0, yMax / 2, yMax]
    .map((v) => `  <line x1="${PLOT.left}" y1="${round(y(v))}" x2="${PLOT.right}" y2="${round(y(v))}" class="grid"/>
  <text x="${PLOT.left - 12}" y="${round(y(v)) + 4}" class="axis" text-anchor="end">${formatNumber(v)}</text>`)
    .join('\n');

  const months = days
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.date.endsWith('-01'))
    .map(({ d, i }) => {
      const month = MONTHS[Number(d.date.slice(5, 7)) - 1];
      return `  <line x1="${round(x(i))}" y1="${PLOT.bottom}" x2="${round(x(i))}" y2="${PLOT.bottom + 5}" class="grid"/>
  <text x="${round(x(i))}" y="${PLOT.bottom + 22}" class="axis" text-anchor="middle">${month}</text>`;
    })
    .join('\n');

  let chart = `  <text x="${WIDTH / 2}" y="${(PLOT.top + PLOT.bottom) / 2}" class="empty muted" text-anchor="middle">Sem contribuições no período</text>`;
  if (days.length > 0) {
    const points = days.map((d, i) => `${round(x(i))} ${round(y(d.count))}`);
    const line = `M${points.join('L')}`;
    const area = `${line}L${round(x(days.length - 1))} ${PLOT.bottom}L${round(x(0))} ${PLOT.bottom}Z`;
    chart = `  <path class="area" d="${area}" fill="url(#area)"/>
  <path class="line" d="${line}"/>`;
  }

  const summary = `${formatNumber(total)} contribuições · pico de ${formatNumber(peak)} em um dia`;
  const css = `
    .grid { stroke: ${theme.area}; stroke-opacity: 0.55; stroke-width: 1; }
    .axis { font-size: 12px; fill: ${theme.muted}; }
    .summary { font-size: 14px; fill: ${theme.text}; }
    .line { fill: none; stroke: ${theme.line}; stroke-width: 1.6; stroke-linejoin: round; stroke-linecap: round; }
    .empty { font-size: 14px; }`;

  return card({
    width: WIDTH,
    height: HEIGHT,
    label: `${TITLE}: ${summary}`,
    css,
    body: `  <defs>
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${theme.line}" stop-opacity="0.6"/>
      <stop offset="1" stop-color="${theme.area}" stop-opacity="0.2"/>
    </linearGradient>
  </defs>
  <text x="30" y="44" class="title" style="font-size: 20px">${TITLE}</text>
  <text x="${WIDTH - 30}" y="44" class="summary" text-anchor="end">${summary}</text>
${grid}
${months}
${chart}`,
  });
}
