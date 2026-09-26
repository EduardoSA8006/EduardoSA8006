// Utilidades de texto e números compartilhadas pelos renderizadores
// (textos e formatos por idioma ficam em i18n.js).

const XML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

export function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => XML_ENTITIES[ch]);
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
