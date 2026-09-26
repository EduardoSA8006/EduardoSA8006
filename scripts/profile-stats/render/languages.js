// Card "Linguagens mais usadas" em layout compacto (495×195).

import { card, safeColor, theme } from './theme.js';
import { escapeXml, round } from './svg.js';
import { messages } from './i18n.js';
import { OTHER_LANGUAGES } from '../aggregate.js';

const BAR = { x: 25, y: 52, width: 445, height: 10 };

export function renderLanguages(languages, { locale } = {}) {
  const t = messages(locale);
  const title = escapeXml(t.languages.title);
  const css = `
    .lang { font-size: 13px; fill: ${theme.text}; }
    .pct { fill: ${theme.muted}; }
    .empty { font-size: 13px; }`;

  if (languages.length === 0) {
    return card({
      width: 495,
      height: 195,
      label: `${t.languages.title}: ${t.languages.emptyLabel}`,
      css,
      body: `  <text x="25" y="35" class="title">${title}</text>
  <text x="247.5" y="115" class="empty muted" text-anchor="middle">${escapeXml(t.languages.empty)}</text>`,
    });
  }

  // O agrupamento "Outras" vem da agregação; aqui só ganha o nome do idioma.
  const nameOf = (lang) => (lang.name === OTHER_LANGUAGES ? t.languages.other : lang.name);

  const total = languages.reduce((acc, l) => acc + l.percent, 0);
  let offset = BAR.x;
  const segments = languages
    .map((lang) => {
      const width = (lang.percent / total) * BAR.width;
      const rect = `    <rect class="segment" x="${round(offset)}" y="${BAR.y}" width="${round(width + 0.5)}" height="${BAR.height}" fill="${safeColor(lang.color)}"/>`;
      offset += width;
      return rect;
    })
    .join('\n');

  const perColumn = Math.ceil(languages.length / 2);
  const legend = languages
    .map((lang, i) => {
      const x = i < perColumn ? 25 : 260;
      const y = 92 + (i % perColumn) * 21;
      return `  <circle cx="${x + 5}" cy="${y - 4.5}" r="5" fill="${safeColor(lang.color)}"/>
  <text x="${x + 17}" y="${y}" class="lang">${escapeXml(nameOf(lang))} <tspan class="pct">${t.formatPercent(lang.percent)}</tspan></text>`;
    })
    .join('\n');

  const summary = languages.map((l) => `${nameOf(l)} ${t.formatPercent(l.percent)}`).join(', ');
  return card({
    width: 495,
    height: 195,
    label: `${t.languages.title}: ${summary}`,
    css,
    body: `  <defs>
    <clipPath id="bar"><rect x="${BAR.x}" y="${BAR.y}" width="${BAR.width}" height="${BAR.height}" rx="${BAR.height / 2}"/></clipPath>
  </defs>
  <text x="25" y="35" class="title">${title}</text>
  <g clip-path="url(#bar)">
${segments}
  </g>
${legend}`,
  });
}
