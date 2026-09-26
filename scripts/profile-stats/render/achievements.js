// Card "Conquistas": 6 marcos em grade 3×2, cada um com nível e progresso
// até o próximo limiar (990×260). Só números agregados — nada de repositórios.

import { card, levelColor, theme } from './theme.js';
import { escapeXml, round } from './svg.js';
import { messages } from './i18n.js';
import { ICONS } from './icons.js';
import { levelProgress } from '../aggregate.js';

const WIDTH = 990;
const HEIGHT = 260;
const GRID = { x: 25, y: 60, columns: 3, cellWidth: 300, columnGap: 20, rowHeight: 100 };
const BADGE = { cx: 22, cy: 34, r: 20 };
const TEXT_X = 58;
const BAR = { y: 60, height: 6 };
const PILL = { width: 70, height: 20 };

const ACHIEVEMENTS = [
  { key: 'totalContributions', icon: 'pulse', thresholds: [100, 500, 1000, 2500, 5000] },
  { key: 'longestStreak', icon: 'flame', thresholds: [7, 30, 100, 365], unit: 'days' },
  { key: 'peakDay', icon: 'bolt', thresholds: [25, 50, 100, 200] },
  { key: 'pullRequests', icon: 'pullRequest', thresholds: [10, 50, 100, 500] },
  { key: 'languageCount', icon: 'code', thresholds: [3, 5, 10, 15] },
  { key: 'repositories', icon: 'repo', thresholds: [5, 10, 25, 50] },
];

function renderCell(achievement, value, index, t) {
  const { level, maxLevel, next, progress } = levelProgress(value, achievement.thresholds);
  const color = levelColor(level, maxLevel);
  const x0 = GRID.x + (index % GRID.columns) * (GRID.cellWidth + GRID.columnGap);
  const y0 = GRID.y + Math.floor(index / GRID.columns) * GRID.rowHeight;
  const textX = x0 + TEXT_X;
  const right = x0 + GRID.cellWidth;
  const barWidth = right - textX;

  const title = t.achievements.items[achievement.key];
  const unitFor = (count) => (achievement.unit ? t.achievements.units[achievement.unit](count) : '');
  const unitText = unitFor(value);
  const unit = unitText ? `<tspan class="unit" dx="6">${escapeXml(unitText)}</tspan>` : '';
  const caption = next === null
    ? t.achievements.max
    : t.achievements.next(`${t.formatNumber(next)}${achievement.unit ? ` ${unitFor(next)}` : ''}`);

  return `  <circle cx="${x0 + BADGE.cx}" cy="${y0 + BADGE.cy}" r="${BADGE.r}" fill="${color}" fill-opacity="0.16" stroke="${color}" stroke-width="1.5"/>
  <g transform="translate(${x0 + BADGE.cx - 9} ${y0 + BADGE.cy - 9}) scale(1.125)" class="icon" stroke="${color}">${ICONS[achievement.icon]}</g>
  <text x="${textX}" y="${y0 + 16}" class="name">${escapeXml(title)}</text>
  <rect x="${right - PILL.width}" y="${y0 + 1}" width="${PILL.width}" height="${PILL.height}" rx="${PILL.height / 2}" fill="${color}" fill-opacity="0.28"/>
  <text x="${right - PILL.width / 2}" y="${y0 + 15.5}" class="level" text-anchor="middle">${escapeXml(t.achievements.level(level, maxLevel))}</text>
  <text x="${textX}" y="${y0 + 45}" class="value">${t.formatNumber(value)}${unit}</text>
  <rect class="track" x="${textX}" y="${y0 + BAR.y}" width="${barWidth}" height="${BAR.height}" rx="${BAR.height / 2}"/>
  <rect class="progress" x="${textX}" y="${y0 + BAR.y}" width="${round(progress * barWidth)}" height="${BAR.height}" rx="${BAR.height / 2}" fill="${color}"/>
  <text x="${textX}" y="${y0 + 83}" class="caption${next === null ? '' : ' muted'}"${next === null ? ` fill="${color}"` : ''}>${escapeXml(caption)}</text>`;
}

export function renderAchievements(records, { locale } = {}) {
  const t = messages(locale);
  const values = ACHIEVEMENTS.map((a) => Number(records[a.key]) || 0);
  const cells = ACHIEVEMENTS.map((a, i) => renderCell(a, values[i], i, t)).join('\n');

  const summary = ACHIEVEMENTS
    .map((a, i) => {
      const { level, maxLevel } = levelProgress(values[i], a.thresholds);
      return `${t.achievements.items[a.key]} ${t.formatNumber(values[i])} (${t.achievements.summaryLevel(level, maxLevel)})`;
    })
    .join(', ');

  const css = `
    .name { font-size: 14px; fill: ${theme.text}; }
    .level { font-size: 12px; font-weight: 600; fill: ${theme.text}; }
    .value { font-size: 22px; font-weight: 700; fill: ${theme.strong}; }
    .unit { font-size: 13px; font-weight: 400; fill: ${theme.muted}; }
    .track { fill: ${theme.area}; fill-opacity: 0.45; }
    .caption { font-size: 12px; }
    .icon { fill: none; stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }`;

  return card({
    width: WIDTH,
    height: HEIGHT,
    label: `${t.achievements.title}: ${summary}`,
    css,
    body: `  <text x="25" y="38" class="title" style="font-size: 20px">${escapeXml(t.achievements.title)}</text>
${cells}`,
  });
}
