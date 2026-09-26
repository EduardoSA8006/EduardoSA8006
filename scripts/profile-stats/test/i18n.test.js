import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LOCALE, LOCALES, formatNumber, formatPercent, messages } from '../render/i18n.js';

test('i18n: pt-BR é o padrão e en está disponível', () => {
  assert.equal(DEFAULT_LOCALE, 'pt-BR');
  assert.deepEqual(LOCALES, ['pt-BR', 'en']);
  assert.equal(messages(), messages('pt-BR'));
  assert.throws(() => messages('fr'), /fr/);
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

test('formatNumber/formatPercent: formato en-US', () => {
  assert.equal(formatNumber(3010, 'en'), '3,010');
  assert.equal(formatNumber(1234567, 'en'), '1,234,567');
  assert.equal(formatNumber(304, 'en'), '304');
  assert.equal(formatPercent(44.7, 'en'), '44.7%');
  assert.equal(formatPercent(100, 'en'), '100.0%');
  assert.equal(formatNumber(3010, 'pt-BR'), '3.010');
  assert.equal(formatPercent(44.7, 'pt-BR'), '44,7%');
});

test('messages: formatadores ligados ao locale', () => {
  assert.equal(messages('en').formatNumber(3010), '3,010');
  assert.equal(messages('pt-BR').formatPercent(44.7), '44,7%');
});

test('messages: meses abreviados por locale', () => {
  assert.deepEqual(messages('pt-BR').months, ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']);
  assert.deepEqual(messages('en').months, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
});

test('messages: "desde" por locale', () => {
  assert.equal(messages('pt-BR').since('2024-11-12T23:12:21Z'), 'desde nov/2024');
  assert.equal(messages('en').since('2024-11-12T23:12:21Z'), 'since Nov 2024');
});

test('messages: pt-BR e en têm as mesmas chaves', () => {
  const shape = (value) => (value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map((k) => [k, shape(value[k])]))
    : typeof value);
  assert.deepEqual(shape(messages('en')), shape(messages('pt-BR')));
});
