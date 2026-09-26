// Paleta e moldura compartilhadas pelos cards (mesmas cores do perfil).

import { escapeXml } from './svg.js';

export const theme = {
  background: '#0a1224',
  title: '#60A5FA',
  text: '#cbd5e1',
  muted: '#64748b',
  strong: '#ffffff',
  accent: '#3B82F6',
  line: '#60a5fa',
  area: '#1e3a8a',
  radius: 4.5,
  font: "'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif",
};

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

// Só aceita cores hexadecimais; qualquer outra coisa vira `fallback`.
export function safeColor(color, fallback = theme.muted) {
  return HEX_COLOR.test(color ?? '') ? color : fallback;
}

// Moldura comum: <svg> com fundo arredondado, sem borda e estilos base.
export function card({ width, height, label, css = '', body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-label="${escapeXml(label)}">
  <title>${escapeXml(label)}</title>
  <style>
    text { font-family: ${theme.font}; }
    .title { font-size: 18px; font-weight: 600; fill: ${theme.title}; }
    .muted { fill: ${theme.muted}; }${css}
  </style>
  <rect width="${width}" height="${height}" rx="${theme.radius}" fill="${theme.background}"/>
${body}
</svg>
`;
}
