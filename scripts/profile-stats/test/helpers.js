import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const hasXmllint = spawnSync('xmllint', ['--version']).status === 0;

// Valida com xmllint quando disponível; senão faz uma checagem estrutural mínima.
export function assertWellFormedSvg(svg) {
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /<\/svg>\s*$/);
  assert.doesNotMatch(svg, /<script|@import|url\(http|href="http/i, 'SVG não pode ter scripts nem recursos externos');
  if (hasXmllint) {
    const result = spawnSync('xmllint', ['--noout', '-'], { input: svg });
    assert.equal(result.status, 0, `XML inválido: ${result.stderr}`);
  }
}
