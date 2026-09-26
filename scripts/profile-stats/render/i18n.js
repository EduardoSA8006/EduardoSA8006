// Textos e formatos dos cards por idioma. Os renderizadores recebem `locale`
// ('pt-BR' por padrão ou 'en') e só variam no que vem daqui — layout e dados
// são os mesmos nos dois idiomas.

export const DEFAULT_LOCALE = 'pt-BR';

const DICTIONARIES = {
  'pt-BR': {
    intl: 'pt-BR',
    months: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
    sinceLabel: (month, year) => `desde ${month}/${year}`,
    stats: {
      title: 'Minhas estatísticas',
      rows: {
        lastYearContributions: 'Contribuições no último ano',
        privateContributions: 'Contribuições privadas',
        commits: 'Commits públicos',
        pullRequests: 'PRs públicos',
        issues: 'Issues públicas',
        repositories: 'Repositórios públicos',
      },
      total: 'contribuições totais',
      label: (total) => `Estatísticas do GitHub: ${total} contribuições totais, incluindo privadas`,
    },
    activity: {
      title: 'Contribuições · último ano',
      summary: (total, peak, count) => `${total} ${count === 1 ? 'contribuição' : 'contribuições'} · pico de ${peak} em um dia`,
      empty: 'Sem contribuições no período',
    },
    languages: {
      title: 'Linguagens mais usadas',
      other: 'Outras',
      empty: 'Sem dados de linguagens',
      emptyLabel: 'sem dados',
    },
    achievements: {
      title: 'Conquistas',
      items: {
        totalContributions: 'Contribuições totais',
        longestStreak: 'Maior sequência de dias',
        peakDay: 'Pico em um dia',
        pullRequests: 'PRs públicos',
        languageCount: 'Linguagens usadas',
        repositories: 'Repositórios públicos',
      },
      units: { days: (count) => (count === 1 ? 'dia' : 'dias') },
      level: (level, maxLevel) => `Nível ${level}/${maxLevel}`,
      summaryLevel: (level, maxLevel) => `nível ${level}/${maxLevel}`,
      next: (value) => `próximo nível: ${value}`,
      max: 'nível máximo',
    },
  },
  en: {
    intl: 'en-US',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    sinceLabel: (month, year) => `since ${month} ${year}`,
    stats: {
      title: 'My stats',
      rows: {
        lastYearContributions: 'Contributions in the last year',
        privateContributions: 'Private contributions',
        commits: 'Public commits',
        pullRequests: 'Public PRs',
        issues: 'Public issues',
        repositories: 'Public repositories',
      },
      total: 'total contributions',
      label: (total) => `GitHub stats: ${total} total contributions, including private ones`,
    },
    activity: {
      title: 'Contributions · last year',
      summary: (total, peak, count) => `${total} ${count === 1 ? 'contribution' : 'contributions'} · peak of ${peak} in a day`,
      empty: 'No contributions in this period',
    },
    languages: {
      title: 'Most used languages',
      other: 'Other',
      empty: 'No language data',
      emptyLabel: 'no data',
    },
    achievements: {
      title: 'Achievements',
      items: {
        totalContributions: 'Total contributions',
        longestStreak: 'Longest streak',
        peakDay: 'Peak in a day',
        pullRequests: 'Public PRs',
        languageCount: 'Languages used',
        repositories: 'Public repositories',
      },
      units: { days: (count) => (count === 1 ? 'day' : 'days') },
      level: (level, maxLevel) => `Level ${level}/${maxLevel}`,
      summaryLevel: (level, maxLevel) => `level ${level}/${maxLevel}`,
      next: (value) => `next level: ${value}`,
      max: 'max level',
    },
  },
};

export const LOCALES = Object.keys(DICTIONARIES);

// Dicionário do locale com formatadores de número/percentual e o rótulo
// "desde <mês>/<ano>" já ligados a ele. Instâncias em cache por locale.
const cache = new Map();

export function messages(locale = DEFAULT_LOCALE) {
  if (cache.has(locale)) return cache.get(locale);
  const dict = DICTIONARIES[locale];
  if (!dict) throw new Error(`Idioma não suportado: ${locale}`);

  const integerFormat = new Intl.NumberFormat(dict.intl, { maximumFractionDigits: 0, useGrouping: 'always' });
  const percentFormat = new Intl.NumberFormat(dict.intl, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const m = {
    ...dict,
    formatNumber: (value) => integerFormat.format(value),
    formatPercent: (value) => `${percentFormat.format(value)}%`,
    since: (iso) => {
      const date = new Date(iso);
      return dict.sinceLabel(dict.months[date.getUTCMonth()], date.getUTCFullYear());
    },
  };
  cache.set(locale, m);
  return m;
}

export function formatNumber(value, locale = DEFAULT_LOCALE) {
  return messages(locale).formatNumber(value);
}

export function formatPercent(value, locale = DEFAULT_LOCALE) {
  return messages(locale).formatPercent(value);
}
