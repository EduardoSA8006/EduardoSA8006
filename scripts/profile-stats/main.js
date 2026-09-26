// Gera stats.svg, activity.svg e languages.svg em OUT_DIR (padrão: dist).
//
// Env:
//   GITHUB_TOKEN  obrigatório — contribuições e estatísticas (user(login)).
//   LANGS_TOKEN   opcional — PAT do dono (Metadata: read) para incluir repos privados nas linguagens.
//   GH_LOGIN      obrigatório — login do usuário.
//   OUT_DIR       opcional — diretório de saída.
//
// Qualquer erro encerra com código 1 para que o workflow não publique a branch sem os SVGs.
// Os logs trazem só números agregados — nunca nomes de repositórios.
//
// Aviso: rodar isto localmente com um token do dono (dono do PAT/GITHUB_TOKEN
// com acesso próprio) pode gerar números diferentes do Actions, que enxerga
// só dados públicos com o GITHUB_TOKEN padrão — exceto languages.svg quando
// LANGS_TOKEN estiver configurado.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from './github.js';
import { collectContributions, collectLanguagesWithFallback } from './collect.js';
import { renderStats } from './render/stats.js';
import { renderActivity } from './render/activity.js';
import { renderLanguages } from './render/languages.js';

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável de ambiente ${name} ausente.`);
  return value;
}

async function main() {
  const login = requireEnv('GH_LOGIN');
  const client = createClient({ token: requireEnv('GITHUB_TOKEN') });
  const outDir = process.env.OUT_DIR?.trim() || 'dist';

  let langsClient = client;
  const langsToken = process.env.LANGS_TOKEN?.trim();
  if (langsToken) {
    langsClient = createClient({ token: langsToken });
  } else {
    console.log('::warning::LANGS_TOKEN ausente: languages.svg considera apenas repositórios públicos (GITHUB_TOKEN). ' +
      'Crie um PAT fine-grained com "Metadata: read" em todos os repositórios e salve no secret LANGS_TOKEN.');
  }

  const [{ stats, days }, languages] = await Promise.all([
    collectContributions(client, login),
    collectLanguagesWithFallback(langsClient, client, login),
  ]);

  await mkdir(outDir, { recursive: true });
  await Promise.all([
    writeFile(join(outDir, 'stats.svg'), renderStats(stats)),
    writeFile(join(outDir, 'activity.svg'), renderActivity(days)),
    writeFile(join(outDir, 'languages.svg'), renderLanguages(languages)),
  ]);

  console.log(`Contribuições totais: ${stats.totalContributions} (desde ${stats.since})`);
  console.log(`Último ano: ${stats.lastYearContributions} | privadas (total): ${stats.privateContributions}`);
  console.log(`Commits: ${stats.commits} | PRs: ${stats.pullRequests} | issues: ${stats.issues} | repositórios: ${stats.repositories}`);
  console.log(`Linguagens: ${languages.length} | SVGs gravados em ${outDir}/`);
}

main().catch((error) => {
  console.log(`::error::${error.message}`);
  process.exit(1);
});
