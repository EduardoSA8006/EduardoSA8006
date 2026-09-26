import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeXml, formatNumber, formatPercent, niceCeil } from '../render/svg.js';

test('escapeXml: escapa os 5 caracteres especiais', () => {
  assert.equal(escapeXml(`<a href="x">Tom & 'Jerry'</a>`),
    '&lt;a href=&quot;x&quot;&gt;Tom &amp; &apos;Jerry&apos;&lt;/a&gt;');
});

test('escapeXml: converte não-strings e mantém acentos', () => {
  assert.equal(escapeXml(42), '42');
  assert.equal(escapeXml('Contribuições · último ano'), 'Contribuições · último ano');
});

test('formatNumber: separador de milhar pt-BR', () => {
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber(304), '304');
  assert.equal(formatNumber(2743), '2.743');
  assert.equal(formatNumber(1234567), '1.234.567');
});

test('formatPercent: vírgula decimal e uma casa', () => {
  assert.equal(formatPercent(44.7912), '44,8%');
  assert.equal(formatPercent(9.12), '9,1%');
  assert.equal(formatPercent(100), '100,0%');
  assert.equal(formatPercent(0.04), '0,0%');
});

test('niceCeil: arredonda para cima em valores "redondos"', () => {
  assert.equal(niceCeil(0), 1);
  assert.equal(niceCeil(7), 10);
  assert.equal(niceCeil(38), 40);
  assert.equal(niceCeil(41), 50);
  assert.equal(niceCeil(100), 100);
  assert.equal(niceCeil(101), 150);
  assert.equal(niceCeil(260), 300);
});
