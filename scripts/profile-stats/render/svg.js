// Utilidades de texto e números compartilhadas pelos renderizadores.

export const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const XML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

export function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => XML_ENTITIES[ch]);
}

const integerFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0, useGrouping: 'always' });
const percentFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatNumber(value) {
  return integerFormat.format(value);
}

export function formatPercent(value) {
  return `${percentFormat.format(value)}%`;
}

// Menor valor "redondo" (1, 1.5, 2, 2.5, 3, 4, 5, 10 × 10^n) que seja >= value.
export function niceCeil(value) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 10];
  const step = steps.find((s) => s * magnitude >= value);
  return step * magnitude;
}

// Arredonda coordenadas para manter os SVGs pequenos.
export const round = (n) => Math.round(n * 10) / 10;
