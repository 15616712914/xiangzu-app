import season from "./season.json";
import { TEAMS, type Player } from "./teams";

export type MatchStatus = "finished" | "live" | "upcoming";
export type MatchPhase = "league" | "knockout";

export type MatchEvent = {
  minute: number;
  type: "goal" | "yellow" | "red" | "sub";
  side: "home" | "away";
  playerId: string;
  note?: string;
};

export type MatchStats = {
  possession: [number, number];
  shots: [number, number];
  onTarget: [number, number];
  corners: [number, number];
  fouls: [number, number];
};

export type Match = {
  id: string;
  round: number;
  date: string;
  time: string;
  home: string;
  away: string;
  status: MatchStatus;
  /** Official result, kept explicitly so the app no longer has to invent goal events. */
  homeGoals: number;
  awayGoals: number;
  phase: MatchPhase;
  stage?: string;
  leg?: number | null;
  venue?: string;
  /** Penalty shoot-out score, home/away, when a knockout tie was level after two legs. */
  penalty?: [number, number];
  events: MatchEvent[];
  stats: MatchStats;
  attendance: number;
  startMinute?: number;
};

type SeasonFile = {
  season: number;
  updatedAt: string;
  teams: { id: string; cfaId: number; name: string; stadium: string }[];
  matches: Match[];
  squads: Record<string, Player[]>;
};

export const SEASON = season as unknown as SeasonFile;

export const SQUADS: Record<string, Player[]> = SEASON.squads;

export const PLAYER_MAP: Record<string, Player> = Object.fromEntries(
  Object.values(SQUADS)
    .flat()
    .map((p) => [p.id, p]),
);

export const TOTAL_ROUNDS = 13;
export const CURRENT_ROUND = 13;
export const MATCHES: Match[] = SEASON.matches;

/** Official rosters do not publish a starting XI; the whole registered squad is shown. */
export function startersOf(teamId: string) {
  return SQUADS[teamId] ?? [];
}
export function isStarter() {
  return false;
}

export function visibleEvents(match: Match, liveMinute?: number) {
  if (match.status === "upcoming") return [];
  if (match.status === "live")
    return match.events.filter((e) => e.minute <= (liveMinute ?? match.startMinute ?? 0));
  return match.events;
}

export function score(match: Match, _liveMinute?: number): [number, number] {
  return [match.homeGoals, match.awayGoals];
}

export type StandingRow = {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
  form: ("W" | "D" | "L")[];
};

function emptyRow(teamId: string): StandingRow {
  return { teamId, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, form: [] };
}

function addToRow(row: StandingRow, gf: number, ga: number) {
  row.played++;
  row.gf += gf;
  row.ga += ga;
  if (gf > ga) {
    row.won++;
    row.points += 3;
    row.form.push("W");
  } else if (gf < ga) {
    row.lost++;
    row.form.push("L");
  } else {
    row.drawn++;
    row.points++;
    row.form.push("D");
  }
}

/** Head-to-head mini-table for teams level on points, matching the official rules. */
function miniTable(ids: Set<string>, matches: Match[]) {
  const rows: Record<string, StandingRow> = Object.fromEntries([...ids].map((id) => [id, emptyRow(id)]))
  for (const m of matches) {
    if (m.status !== "finished" || m.phase !== "league") continue;
    if (!ids.has(m.home) || !ids.has(m.away)) continue;
    const [hs, as] = score(m)
    addToRow(rows[m.home], hs, as)
    addToRow(rows[m.away], as, hs)
  }
  return rows
}

export function computeStandings(matches: Match[]): StandingRow[] {
  const rows = Object.fromEntries(TEAMS.map((t) => [t.id, emptyRow(t.id)]));
  for (const m of matches) {
    if (m.phase !== "league" || m.status !== "finished") continue;
    const [hs, as] = score(m);
    addToRow(rows[m.home], hs, as);
    addToRow(rows[m.away], as, hs);
  }
  const byPoints = Object.values(rows).sort((x, y) => y.points - x.points)
  const groups: StandingRow[][] = []
  for (const row of byPoints) {
    const last = groups[groups.length - 1]
    if (last && last[0].points === row.points) last.push(row)
    else groups.push([row])
  }
  const ordered: StandingRow[] = []
  for (const group of groups) {
    if (group.length === 1) {
      ordered.push(group[0])
      continue
    }
    const mini = miniTable(new Set(group.map((r) => r.teamId)), matches)
    group.sort((x, y) => {
      const mx = mini[x.teamId]
      const my = mini[y.teamId]
      return (
        my.points - mx.points ||
        my.gf - my.ga - (mx.gf - mx.ga) ||
        my.gf - mx.gf ||
        y.gf - y.ga - (x.gf - x.ga) ||
        y.gf - x.gf
      )
    })
    ordered.push(...group)
  }
  return ordered.map((r) => ({ ...r, form: r.form.slice(-5) }))
}

/** Season scorers from the official registered-roster totals. */
export function computeScorers(_matches: Match[] = MATCHES) {
  return Object.values(PLAYER_MAP)
    .filter((p) => (p.goals ?? 0) > 0)
    .map((player) => ({
      player,
      goals: player.goals ?? 0,
      penalties: player.penalties ?? 0,
    }))
    .sort((a, b) => b.goals - a.goals || a.penalties - b.penalties || a.player.name.localeCompare(b.player.name));
}

export function stageLabel(match: Match) {
  return match.phase === 'knockout' ? match.stage ?? '淘汰赛' : `第${match.round}轮`
}

export function formatDate(date: string) {
  const d = new Date(date + "T00:00:00");
  const week = "日一二三四五六"[d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 周${week}`;
}

export type PlayerStats = {
  appearances: number;
  starts: number;
  goals: number;
  penalties: number;
  yellow: number;
  red: number;
  goalLog: { match: Match; minute: number; penalty: boolean }[];
};

export function computePlayerStats(playerId: string, _matches: Match[] = MATCHES): PlayerStats {
  const player = PLAYER_MAP[playerId];
  return {
    appearances: player?.appearances ?? 0,
    starts: 0,
    goals: player?.goals ?? 0,
    penalties: player?.penalties ?? 0,
    yellow: player?.yellow ?? 0,
    red: player?.red ?? 0,
    goalLog: [],
  };
}
