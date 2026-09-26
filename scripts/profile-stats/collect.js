// Consultas à API → dados agregados prontos para renderizar.
// As consultas nunca pedem nome, descrição ou URL de repositório.

import { paginate } from './github.js';
import { yearWindows, summarizeContributions, calendarDays, aggregateLanguages } from './aggregate.js';

const PROFILE_QUERY = `
  query ($login: String!) {
    user(login: $login) {
      createdAt
      repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) { totalCount }
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount } }
        }
      }
    }
  }`;

const WINDOW_QUERY = `
  query ($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        restrictedContributionsCount
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        contributionCalendar { totalContributions }
      }
    }
  }`;

const LANGUAGES_QUERY = `
  query ($login: String!, $after: String) {
    user(login: $login) {
      repositories(ownerAffiliations: OWNER, isFork: false, first: 100, after: $after) {
        nodes {
          languages(first: 20, orderBy: { field: SIZE, direction: DESC }) {
            edges { size node { name color } }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }`;

function requireUser(data, login) {
  if (!data?.user) throw new Error(`Usuário "${login}" não encontrado na API do GitHub.`);
  return data.user;
}

// Estatísticas de contribuição (públicas + privadas) e dias do último ano.
export async function collectContributions(client, login, now = new Date()) {
  const profile = requireUser(await client.graphql(PROFILE_QUERY, { login }), login);

  const collections = [];
  for (const { from, to } of yearWindows(profile.createdAt, now)) {
    const data = await client.graphql(WINDOW_QUERY, { login, from, to });
    collections.push(requireUser(data, login).contributionsCollection);
  }

  const calendar = profile.contributionsCollection.contributionCalendar;
  return {
    stats: {
      ...summarizeContributions(collections),
      lastYearContributions: calendar.totalContributions,
      repositories: profile.repositories.totalCount,
      since: profile.createdAt,
    },
    days: calendarDays(calendar),
  };
}

// Linguagens por bytes nos repositórios próprios (sem forks). Inclui privados
// quando o token do cliente tem acesso a eles.
export async function collectLanguages(client, login, { limit = 10 } = {}) {
  const repos = await paginate(async (after) => {
    const data = await client.graphql(LANGUAGES_QUERY, { login, after });
    return requireUser(data, login).repositories;
  });
  return aggregateLanguages(repos, { limit });
}

// Erro de autenticação/permissão (token inválido, expirado ou sem acesso),
// seja como HTTP 401/403 ou como recusa reportada pelo GraphQL.
const AUTH_ERROR_PATTERN = /\b(401|403)\b|unauthorized|forbidden|bad credentials|resource not accessible|insufficient (?:scope|permission)/i;

export function isAuthError(error) {
  return AUTH_ERROR_PATTERN.test(error?.message ?? '');
}

// Tenta `langsClient` (normalmente LANGS_TOKEN); se falhar por autenticação,
// registra um aviso (sem token nem resposta crua da API) e refaz com
// `fallbackClient` (GITHUB_TOKEN, só repositórios públicos). Qualquer outro
// erro (rede, 5xx, etc.) propaga normalmente.
export async function collectLanguagesWithFallback(langsClient, fallbackClient, login, options) {
  if (langsClient === fallbackClient) return collectLanguages(langsClient, login, options);

  try {
    return await collectLanguages(langsClient, login, options);
  } catch (error) {
    if (!isAuthError(error)) throw error;
    console.log('::warning::LANGS_TOKEN inválido ou expirado (falha de autenticação/permissão). ' +
      'Refazendo languages.svg com GITHUB_TOKEN, que só enxerga repositórios públicos.');
    return collectLanguages(fallbackClient, login, options);
  }
}
