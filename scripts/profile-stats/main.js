// Gera stats.svg, activity.svg, languages.svg e conquistas.svg em OUT_DIR (padrão: dist),
// em pt-BR, e as versões em inglês com sufixo -en (stats-en.svg etc.). Os dados
// são coletados uma única vez e renderizados nos dois idiomas.
//
// Env:
//   GITHUB_TOKEN  obrigatório — contribuições e estatísticas (user(login)).
//   LANGS_TOKEN   opcional — PAT do dono (Metadata: read) para incluir repos privados nas linguagens
//                 (languages.svg e a conquista "Linguagens usadas").
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
import { renderAchievements } from './render/achievements.js';

// Idioma → sufixo dos arquivos. pt-BR mantém os nomes originais.
const OUTPUTS = [
  { locale: 'pt-BR', suffix: '' },
  { locale: 'en', suffix: '-en' },
];

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
    console.log('::warning::LANGS_TOKEN ausente: languages.svg e a conquista "Linguagens usadas" consideram apenas repositórios públicos (GITHUB_TOKEN). ' +
      'Crie um PAT fine-grained com "Metadata: read" em todos os repositórios e salve no secret LANGS_TOKEN.');
  }

  const [{ stats, days }, { languages, languageCount }] = await Promise.all([
    collectContributions(client, login),
    collectLanguagesWithFallback(langsClient, client, login),
  ]);

  await mkdir(outDir, { recursive: true });
  await Promise.all(OUTPUTS.flatMap(({ locale, suffix }) => [
    writeFile(join(outDir, `stats${suffix}.svg`), renderStats(stats, { locale })),
    writeFile(join(outDir, `activity${suffix}.svg`), renderActivity(days, { locale })),
    writeFile(join(outDir, `languages${suffix}.svg`), renderLanguages(languages, { locale })),
    writeFile(join(outDir, `conquistas${suffix}.svg`), renderAchievements({ ...stats, languageCount }, { locale })),
  ]));

  console.log(`Contribuições totais: ${stats.totalContributions} (desde ${stats.since})`);
  console.log(`Último ano: ${stats.lastYearContributions} | privadas (total): ${stats.privateContributions}`);
  console.log(`Commits: ${stats.commits} | PRs: ${stats.pullRequests} | issues: ${stats.issues} | repositórios: ${stats.repositories}`);
  console.log(`Maior sequência: ${stats.longestStreak} dias | pico em um dia: ${stats.peakDay}`);
  console.log(`Linguagens: ${languages.length} no card, ${languageCount} distintas | SVGs gravados em ${outDir}/`);
}

main().catch((error) => {
  console.log(`::error::${error.message}`);
  process.exit(1);
});
