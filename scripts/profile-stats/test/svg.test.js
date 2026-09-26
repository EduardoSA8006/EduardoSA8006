import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeXml, niceCeil } from '../render/svg.js';

test('escapeXml: escapa os 5 caracteres especiais', () => {
  assert.equal(escapeXml(`<a href="x">Tom & 'Jerry'</a>`),
    '&lt;a href=&quot;x&quot;&gt;Tom &amp; &apos;Jerry&apos;&lt;/a&gt;');
});

test('escapeXml: converte não-strings e mantém acentos', () => {
  assert.equal(escapeXml(42), '42');
  assert.equal(escapeXml('Contribuições · último ano'), 'Contribuições · último ano');
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
