// Funções puras: transformam respostas da API em dados agregados.
// Nada aqui faz I/O, e nenhuma saída carrega nome ou descrição de repositório.

export const OTHER_LANGUAGES = 'Outras';
const OTHER_COLOR = '#64748b';
const FALLBACK_COLOR = '#94a3b8';

// Janelas contíguas de no máximo 1 ano (limite do contributionsCollection),
// começando à meia-noite UTC do dia de criação da conta e terminando em `now`.
export function yearWindows(createdAt, now = new Date()) {
  const start = new Date(createdAt);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(now);

  const windows = [];
  let from = start;
  while (from < end) {
    const next = new Date(from);
    next.setUTCFullYear(next.getUTCFullYear() + 1);
    const to = next <= end ? new Date(next.getTime() - 1) : end;
    windows.push({ from: from.toISOString(), to: to.toISOString() });
    from = next;
  }
  return windows;
}

// Soma os contributionsCollection de todas as janelas.
export function summarizeContributions(collections) {
  const summary = {
    totalContributions: 0,
    privateContributions: 0,
    commits: 0,
    pullRequests: 0,
    issues: 0,
  };
  for (const c of collections) {
    summary.totalContributions += c.contributionCalendar.totalContributions;
    summary.privateContributions += c.restrictedContributionsCount;
    summary.commits += c.totalCommitContributions;
    summary.pullRequests += c.totalPullRequestContributions;
    summary.issues += c.totalIssueContributions;
  }
  return summary;
}

// contributionCalendar.weeks[].contributionDays[] → [{ date, count }] em ordem.
export function calendarDays(calendar) {
  return calendar.weeks
    .flatMap((week) => week.contributionDays)
    .map((day) => ({ date: day.date, count: day.contributionCount }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Une os calendários de várias janelas em [{ date, count }] ordenado por data.
// Defensivo: se uma data aparecer em mais de uma janela, fica a maior contagem.
export function mergeCalendarDays(calendars) {
  const byDate = new Map();
  for (const calendar of calendars) {
    for (const { date, count } of calendarDays(calendar)) {
      byDate.set(date, Math.max(count, byDate.get(date) ?? 0));
    }
  }
  return [...byDate]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Maior sequência de dias consecutivos com pelo menos 1 contribuição.
// Dias com 0 ou ausentes do calendário quebram a sequência.
export function longestStreak(days) {
  let best = 0;
  let current = 0;
  let previous = null;
  for (const { date, count } of days) {
    const time = Date.parse(`${date}T00:00:00Z`);
    if (count <= 0) {
      current = 0;
    } else {
      current = previous !== null && time - previous === DAY_MS ? current + 1 : 1;
      best = Math.max(best, current);
    }
    previous = time;
  }
  return best;
}

// Maior contagem de contribuições em um único dia.
export function peakDay(days) {
  return days.reduce((max, { count }) => Math.max(max, count), 0);
}

// Nível alcançado em uma escala crescente de limiares e o progresso (0–1)
// do limiar atual até o próximo. No nível máximo, `next` é null e a barra fica cheia.
export function levelProgress(value, thresholds) {
  const maxLevel = thresholds.length;
  const level = thresholds.filter((t) => value >= t).length;
  if (level === maxLevel) return { level, maxLevel, next: null, progress: 1 };

  const floor = level === 0 ? 0 : thresholds[level - 1];
  const next = thresholds[level];
  return { level, maxLevel, next, progress: (value - floor) / (next - floor) };
}

// Soma bytes por linguagem em todos os repositórios (só linguagens com código).
function languageTotals(repos) {
  const byName = new Map();
  for (const repo of repos) {
    for (const { size, node } of repo.languages?.edges ?? []) {
      const entry = byName.get(node.name) ?? { name: node.name, color: node.color, size: 0 };
      entry.size += size;
      entry.color ??= node.color;
      byName.set(node.name, entry);
    }
  }
  return [...byName.values()].filter((l) => l.size > 0);
}

// Número de linguagens distintas com código (antes de agrupar em "Outras").
export function countLanguages(repos) {
  return languageTotals(repos).length;
}

// Devolve as `limit` linguagens com mais bytes (a última vira "Outras" quando
// há excedente).
export function aggregateLanguages(repos, { limit = 10 } = {}) {
  const sorted = languageTotals(repos)
    .sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
  const total = sorted.reduce((acc, l) => acc + l.size, 0);
  if (total === 0) return [];

  let top = sorted;
  if (sorted.length > limit) {
    top = sorted.slice(0, limit - 1);
    const rest = sorted.slice(limit - 1).reduce((acc, l) => acc + l.size, 0);
    top.push({ name: OTHER_LANGUAGES, color: OTHER_COLOR, size: rest });
  }

  return top.map(({ name, color, size }) => ({
    name,
    color: color || FALLBACK_COLOR,
    size,
    percent: (size / total) * 100,
  }));
}
