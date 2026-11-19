import { createRng, hashString } from "./random";
import { TEAMS, type Player, type Position } from "./teams";

export type MatchStatus = "finished" | "live" | "upcoming";

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
  events: MatchEvent[];
  stats: MatchStats;
  attendance: number;
  startMinute?: number;
};

const SURNAMES =
  "王李张刘陈杨黄赵周吴徐孙胡朱高林何郭罗梁宋郑谢唐邓彭曾谭廖邹熊龙蒋贺易阳刘欧向田文胡".split("");
const GIVEN =
  "伟强磊洋勇军杰涛斌超明刚平辉鹏华飞鑫波宇浩凯健俊帆帅旭宁龙林阳峰亮锋晨雄博文志宏".split("");
const JOBS = [
  "中学体育老师",
  "外卖骑手",
  "程序员",
  "大学生",
  "个体户",
  "公务员",
  "快递员",
  "厨师",
  "医生",
  "工程师",
  "果园承包户",
  "退役职业球员",
  "健身教练",
  "银行职员",
  "民警",
  "高中生",
  "网约车司机",
  "米粉店老板",
];

const SQUAD_SHAPE: Position[] = [
  "门将",
  "门将",
  "后卫",
  "后卫",
  "后卫",
  "后卫",
  "后卫",
  "后卫",
  "中场",
  "中场",
  "中场",
  "中场",
  "中场",
  "中场",
  "前锋",
  "前锋",
  "前锋",
  "前锋",
];

function buildSquads(): Record<string, Player[]> {
  const squads: Record<string, Player[]> = {};
  for (const team of TEAMS) {
    const rng = createRng(hashString("squad-" + team.id));
    const used = new Set<number>();
    const names = new Set<string>();
    squads[team.id] = SQUAD_SHAPE.map((position, i) => {
      let number = position === "门将" ? (i === 0 ? 1 : 12) : rng.int(2, 33);
      while (used.has(number)) number = rng.int(2, 33);
      used.add(number);
      let name = "";
      do {
        name = rng.pick(SURNAMES) + rng.pick(GIVEN) + (rng.next() > 0.45 ? rng.pick(GIVEN) : "");
      } while (names.has(name));
      names.add(name);
      const base =
        position === "门将" ? 186 : position === "后卫" ? 181 : position === "前锋" ? 178 : 174;
      const height = base + rng.int(-6, 7);
      const footRoll = rng.next();
      return {
        id: `${team.id}-${i}`,
        teamId: team.id,
        number,
        name,
        position,
        age: rng.int(17, 39),
        job: rng.pick(JOBS),
        height,
        weight: Math.round(height - 108 + rng.int(-5, 8)),
        foot: footRoll < 0.72 ? "右脚" : footRoll < 0.92 ? "左脚" : "双脚",
      };
    });
  }
  return squads;
}

export const SQUADS = buildSquads();

/** Squad indexes that make up the usual starting XI (1 GK, 4 DF, 4 MF, 2 FW). */
const STARTER_INDEXES = [0, 2, 3, 4, 5, 8, 9, 10, 11, 14, 15];
export function startersOf(teamId: string) {
  return STARTER_INDEXES.map((i) => SQUADS[teamId][i]);
}
export function isStarter(playerId: string) {
  return STARTER_INDEXES.includes(Number(playerId.split("-").pop()));
}

export const PLAYER_MAP: Record<string, Player> = Object.fromEntries(
  Object.values(SQUADS)
    .flat()
    .map((p) => [p.id, p]),
);

export const TOTAL_ROUNDS = TEAMS.length - 1;
/** The round that is "today" inside this demo season. */
export const CURRENT_ROUND = 9;
const SEASON_START = new Date(2025, 8, 13);
const KICKOFFS = ["15:30", "15:30", "19:30", "19:30", "19:30", "20:00", "20:00"];

function roundDate(round: number, dayOffset: number) {
  const d = new Date(SEASON_START);
  d.setDate(d.getDate() + (round - 1) * 7 + dayOffset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function pickScorer(rng: ReturnType<typeof createRng>, teamId: string) {
  const squad = SQUADS[teamId];
  const roll = rng.next();
  const pool = squad.filter((p) =>
    roll < 0.6 ? p.position === "前锋" : roll < 0.9 ? p.position === "中场" : p.position === "后卫",
  );
  // Bias toward the first two players in each line so a real scoring race emerges.
  return rng.next() < 0.55 ? pool[0] : rng.pick(pool);
}

function buildMatch(
  round: number,
  idx: number,
  home: string,
  away: string,
  status: MatchStatus,
): Match {
  const rng = createRng(hashString(`m-${round}-${home}-${away}`));
  const h = TEAMS.find((t) => t.id === home)!;
  const a = TEAMS.find((t) => t.id === away)!;
  const events: MatchEvent[] = [];
  const homeGoals = rng.poisson(1.25 * h.strength * (1 / a.strength) + 0.15);
  const awayGoals = rng.poisson(1.05 * a.strength * (1 / h.strength));
  for (let i = 0; i < homeGoals; i++)
    events.push({
      minute: rng.int(3, 90),
      type: "goal",
      side: "home",
      playerId: pickScorer(rng, home).id,
      note: rng.next() < 0.12 ? "点球" : undefined,
    });
  for (let i = 0; i < awayGoals; i++)
    events.push({
      minute: rng.int(3, 90),
      type: "goal",
      side: "away",
      playerId: pickScorer(rng, away).id,
      note: rng.next() < 0.12 ? "点球" : undefined,
    });
  const cards = rng.int(1, 5);
  for (let i = 0; i < cards; i++) {
    const side = rng.next() < 0.5 ? "home" : "away";
    const p = rng.pick(SQUADS[side === "home" ? home : away].slice(2));
    events.push({
      minute: rng.int(10, 89),
      type: rng.next() < 0.08 ? "red" : "yellow",
      side,
      playerId: p.id,
    });
  }
  for (const side of ["home", "away"] as const) {
    const squad = SQUADS[side === "home" ? home : away];
    events.push({
      minute: rng.int(55, 80),
      type: "sub",
      side,
      playerId: squad[rng.int(16, 17)].id,
      note: "替补登场",
    });
  }
  events.sort((x, y) => x.minute - y.minute);
  const poss = Math.round(50 + (h.strength - a.strength) * 25 + rng.int(-6, 6));
  const shotsH = homeGoals * 2 + rng.int(4, 10);
  const shotsA = awayGoals * 2 + rng.int(3, 9);
  return {
    id: `r${round}-${idx}`,
    round,
    // In the current round, already-finished matches were played the day before.
    date: roundDate(round, round === CURRENT_ROUND && status === "finished" ? -1 : idx < 4 ? 0 : 1),
    time: KICKOFFS[idx],
    home,
    away,
    status,
    events,
    stats: {
      possession: [poss, 100 - poss],
      shots: [shotsH, shotsA],
      onTarget: [
        Math.min(shotsH, homeGoals + rng.int(1, 4)),
        Math.min(shotsA, awayGoals + rng.int(1, 3)),
      ],
      corners: [rng.int(2, 9), rng.int(1, 8)],
      fouls: [rng.int(8, 18), rng.int(8, 18)],
    },
    attendance: rng.int(8000, 42000),
    startMinute: status === "live" ? 61 : undefined,
  };
}

function buildFixtures(): Match[] {
  const ids = TEAMS.map((t) => t.id);
  const n = ids.length;
  const rotating = ids.slice(1);
  const matches: Match[] = [];
  for (let r = 0; r < n - 1; r++) {
    const order = [ids[0], ...rotating];
    const round = r + 1;
    for (let i = 0; i < n / 2; i++) {
      let home = order[i];
      let away = order[n - 1 - i];
      if ((r + i) % 2 === 1) [home, away] = [away, home];
      let status: MatchStatus = round < CURRENT_ROUND ? "finished" : "upcoming";
      if (round === CURRENT_ROUND) status = i === 0 ? "live" : i < 3 ? "finished" : "upcoming";
      matches.push(buildMatch(round, i, home, away, status));
    }
    rotating.unshift(rotating.pop()!);
  }
  return matches.sort(
    (a, b) => a.round - b.round || a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
  );
}

export const MATCHES = buildFixtures();

export function visibleEvents(match: Match, liveMinute?: number) {
  if (match.status === "upcoming") return [];
  if (match.status === "live")
    return match.events.filter((e) => e.minute <= (liveMinute ?? match.startMinute ?? 0));
  return match.events;
}

export function score(match: Match, liveMinute?: number): [number, number] {
  const ev = visibleEvents(match, liveMinute);
  return [
    ev.filter((e) => e.type === "goal" && e.side === "home").length,
    ev.filter((e) => e.type === "goal" && e.side === "away").length,
  ];
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

export function computeStandings(matches: Match[]): StandingRow[] {
  const rows: Record<string, StandingRow> = Object.fromEntries(
    TEAMS.map((t) => [
      t.id,
      { teamId: t.id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, form: [] },
    ]),
  );
  for (const m of matches) {
    if (m.status !== "finished") continue;
    const [hs, as] = score(m);
    const h = rows[m.home];
    const a = rows[m.away];
    h.played++;
    a.played++;
    h.gf += hs;
    h.ga += as;
    a.gf += as;
    a.ga += hs;
    if (hs > as) {
      h.won++;
      a.lost++;
      h.points += 3;
      h.form.push("W");
      a.form.push("L");
    } else if (hs < as) {
      a.won++;
      h.lost++;
      a.points += 3;
      a.form.push("W");
      h.form.push("L");
    } else {
      h.drawn++;
      a.drawn++;
      h.points++;
      a.points++;
      h.form.push("D");
      a.form.push("D");
    }
  }
  return Object.values(rows)
    .map((r) => ({ ...r, form: r.form.slice(-5) }))
    .sort((x, y) => y.points - x.points || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf);
}

export function computeScorers(matches: Match[]) {
  const tally: Record<string, { goals: number; penalties: number }> = {};
  for (const m of matches) {
    if (m.status !== "finished") continue;
    for (const e of m.events) {
      if (e.type !== "goal") continue;
      tally[e.playerId] ??= { goals: 0, penalties: 0 };
      tally[e.playerId].goals++;
      if (e.note === "点球") tally[e.playerId].penalties++;
    }
  }
  return Object.entries(tally)
    .map(([playerId, t]) => ({ player: PLAYER_MAP[playerId], ...t }))
    .sort((a, b) => b.goals - a.goals || a.penalties - b.penalties);
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

export function computePlayerStats(playerId: string): PlayerStats {
  const teamId = PLAYER_MAP[playerId].teamId;
  const starter = isStarter(playerId);
  const stats: PlayerStats = {
    appearances: 0,
    starts: 0,
    goals: 0,
    penalties: 0,
    yellow: 0,
    red: 0,
    goalLog: [],
  };
  for (const m of MATCHES) {
    if (m.status !== "finished" || (m.home !== teamId && m.away !== teamId)) continue;
    const mine = m.events.filter((e) => e.playerId === playerId);
    if (starter) stats.starts++;
    if (starter || mine.length > 0) stats.appearances++;
    for (const e of mine) {
      if (e.type === "goal") {
        stats.goals++;
        if (e.note === "点球") stats.penalties++;
        stats.goalLog.push({ match: m, minute: e.minute, penalty: e.note === "点球" });
      } else if (e.type === "yellow") stats.yellow++;
      else if (e.type === "red") stats.red++;
    }
  }
  return stats;
}
