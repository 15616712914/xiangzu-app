import { createRng } from "./random";
import { MATCHES, computeStandings, score, type Match } from "./league";
import { TEAMS, TEAM_MAP } from "./teams";

/*
 * A lightweight Poisson goal model:
 *  - each team gets attack/defense ratings from matches played before kickoff,
 *    shrunk toward the league average so early-season numbers stay sane;
 *  - recent form nudges attack, and the home side gets a small boost;
 *  - a score matrix gives win/draw/loss, likely scorelines and goal markets.
 */
const HOME_ADV = 1.12;
const PRIOR_GAMES = 3;
const BASE_GOALS = 1.3;
const MAX_GOALS = 8;

type Rating = {
  attack: number;
  defense: number;
  played: number;
  gfPer: number;
  gaPer: number;
  form: ("W" | "D" | "L")[];
};

function finishedBefore(date: string, time = "99:99") {
  return MATCHES.filter(
    (m) => m.status === "finished" && (m.date < date || (m.date === date && m.time < time)),
  );
}

export function ratingsFrom(matches: Match[]) {
  const acc: Record<string, { gf: number; ga: number; played: number; form: ("W" | "D" | "L")[] }> =
    Object.fromEntries(TEAMS.map((t) => [t.id, { gf: 0, ga: 0, played: 0, form: [] }]));
  let goals = 0;
  for (const m of matches) {
    const [hs, as] = score(m);
    goals += hs + as;
    const h = acc[m.home];
    const a = acc[m.away];
    h.gf += hs;
    h.ga += as;
    a.gf += as;
    a.ga += hs;
    h.played++;
    a.played++;
    h.form.push(hs > as ? "W" : hs < as ? "L" : "D");
    a.form.push(as > hs ? "W" : as < hs ? "L" : "D");
  }
  const avg =
    (goals + BASE_GOALS * 2 * PRIOR_GAMES) / (matches.length * 2 + 2 * PRIOR_GAMES) || BASE_GOALS;
  const ratings: Record<string, Rating> = {};
  for (const [id, t] of Object.entries(acc)) {
    const form = t.form.slice(-5);
    const ppg = form.length
      ? form.reduce((s, f) => s + (f === "W" ? 3 : f === "D" ? 1 : 0), 0) / form.length
      : 1.4;
    ratings[id] = {
      attack:
        ((t.gf + PRIOR_GAMES * avg) / (t.played + PRIOR_GAMES) / avg) * (1 + 0.05 * (ppg - 1.4)),
      defense: (t.ga + PRIOR_GAMES * avg) / (t.played + PRIOR_GAMES) / avg,
      played: t.played,
      gfPer: t.played ? t.gf / t.played : 0,
      gaPer: t.played ? t.ga / t.played : 0,
      form,
    };
  }
  return { ratings, avg };
}

function pmf(lambda: number) {
  const out: number[] = [];
  let p = Math.exp(-lambda);
  for (let k = 0; k <= MAX_GOALS; k++) {
    out.push(p);
    p = (p * lambda) / (k + 1);
  }
  return out;
}

export type Outcome = "home" | "draw" | "away";

export type Prediction = {
  xg: [number, number];
  probs: Record<Outcome, number>;
  pick: Outcome;
  /** Most likely final score that agrees with the picked outcome. */
  predicted: [number, number];
  likely: { score: [number, number]; p: number }[];
  over25: number;
  btts: number;
  confidence: "高" | "中" | "低";
  sample: number;
  factors: { side: "home" | "away" | "both"; text: string }[];
  summary: string;
};

function rankOf(ratings: Record<string, Rating>, id: string, key: "gfPer" | "gaPer") {
  const sorted = Object.entries(ratings)
    .filter(([, r]) => r.played > 0)
    .sort((a, b) => (key === "gfPer" ? b[1][key] - a[1][key] : a[1][key] - b[1][key]));
  return sorted.findIndex(([t]) => t === id) + 1;
}

function formText(form: ("W" | "D" | "L")[]) {
  const w = form.filter((f) => f === "W").length;
  const d = form.filter((f) => f === "D").length;
  const l = form.length - w - d;
  return `近${form.length}场 ${w}胜${d}平${l}负`;
}

/**
 * Pre-match prediction using only information available before kickoff.
 * For a live match pass the current minute to get an in-play forecast.
 */
export function predictMatch(match: Match, liveMinute?: number): Prediction {
  const { ratings, avg } = ratingsFrom(finishedBefore(match.date, match.time));
  const h = ratings[match.home];
  const a = ratings[match.away];
  const xgH = avg * h.attack * a.defense * HOME_ADV;
  const xgA = avg * a.attack * h.defense;

  const inPlay = match.status === "live" && liveMinute !== undefined;
  const remaining = inPlay ? Math.max(0, 90 - liveMinute!) / 90 : 1;
  const [curH, curA] = inPlay ? score(match, liveMinute) : [0, 0];
  const ph = pmf(xgH * remaining);
  const pa = pmf(xgA * remaining);

  const probs = { home: 0, draw: 0, away: 0 };
  let over25 = 0;
  let btts = 0;
  const cells: { score: [number, number]; p: number }[] = [];
  for (let i = 0; i <= MAX_GOALS; i++)
    for (let j = 0; j <= MAX_GOALS; j++) {
      const p = ph[i] * pa[j];
      const fh = curH + i;
      const fa = curA + j;
      if (fh > fa) probs.home += p;
      else if (fh < fa) probs.away += p;
      else probs.draw += p;
      if (fh + fa > 2.5) over25 += p;
      if (fh > 0 && fa > 0) btts += p;
      cells.push({ score: [fh, fa], p });
    }
  const total = probs.home + probs.draw + probs.away;
  (Object.keys(probs) as Outcome[]).forEach((k) => (probs[k] /= total));
  cells.sort((x, y) => y.p - x.p);
  const likely = cells.slice(0, 3);
  const pick = (Object.keys(probs) as Outcome[]).reduce(
    (best, k) => (probs[k] > probs[best] ? k : best),
    "home",
  );
  const outcomeOf = ([x, y]: [number, number]): Outcome =>
    x > y ? "home" : x < y ? "away" : "draw";
  const predicted = cells.find((c) => outcomeOf(c.score) === pick)!.score;
  const top = probs[pick];
  const sample = Math.min(h.played, a.played);
  const confidence = sample < 3 ? "低" : top > 0.55 ? "高" : top > 0.42 ? "中" : "低";

  const home = TEAM_MAP[match.home];
  const away = TEAM_MAP[match.away];
  const factors: Prediction["factors"] = [];
  if (sample > 0) {
    factors.push({ side: "home", text: `${home.city}${formText(h.form)}` });
    factors.push({ side: "away", text: `${away.city}${formText(a.form)}` });
    const atkH = rankOf(ratings, match.home, "gfPer");
    const atkA = rankOf(ratings, match.away, "gfPer");
    const best =
      atkH <= atkA
        ? { t: home, r: h, rank: atkH, side: "home" as const }
        : { t: away, r: a, rank: atkA, side: "away" as const };
    factors.push({
      side: best.side,
      text: `${best.t.city}场均进球 ${best.r.gfPer.toFixed(1)}，进攻排名第${best.rank}`,
    });
    const defH = rankOf(ratings, match.home, "gaPer");
    const defA = rankOf(ratings, match.away, "gaPer");
    const wall =
      defH <= defA
        ? { t: home, r: h, rank: defH, side: "home" as const }
        : { t: away, r: a, rank: defA, side: "away" as const };
    factors.push({
      side: wall.side,
      text: `${wall.t.city}场均失球 ${wall.r.gaPer.toFixed(1)}，防守排名第${wall.rank}`,
    });
  }
  factors.push({ side: "home", text: `${home.city}坐镇${home.stadium}，享有主场优势` });

  const fav = pick === "home" ? home : pick === "away" ? away : null;
  const [sh, sa] = predicted;
  const tone = top > 0.55 ? "占据明显优势" : top > 0.44 ? "略占上风" : "仅有微弱优势";
  let summary: string;
  if (inPlay) {
    summary = `比赛进行到第${liveMinute}分钟，场上比分 ${curH}:${curA}。按剩余时间推算，${
      fav
        ? `${fav.city}最终取胜的概率为 ${Math.round(top * 100)}%`
        : `双方最终握手言和的概率最高（${Math.round(top * 100)}%）`
    }，预测终场比分 ${sh}:${sa}。`;
  } else if (sample === 0) {
    summary = `赛季首轮缺少历史数据，模型以联赛平均水平和主场优势进行估算，${home.city}稍被看好，预测比分 ${sh}:${sa}。`;
  } else {
    const lead = fav
      ? `模型认为${fav.city}${tone}，取胜概率 ${Math.round(top * 100)}%。`
      : `双方实力接近，平局是最可能的结果（${Math.round(top * 100)}%）。`;
    const attack =
      xgH + xgA > 2.7
        ? "两队预期进球合计较高，可能是一场对攻战"
        : xgH + xgA < 2.1
          ? "两队预期进球偏低，比赛或将陷入胶着"
          : "预期进球处于联赛平均水平";
    summary = `${lead}${attack}，预测比分 ${sh}:${sa}。${
      confidence === "低" ? "由于双方差距不大，本场存在较大不确定性。" : ""
    }`;
  }

  return {
    xg: [xgH, xgA],
    probs,
    pick,
    predicted,
    likely,
    over25,
    btts,
    confidence,
    sample,
    factors,
    summary,
  };
}

export function actualOutcome(match: Match): Outcome {
  const [hs, as] = score(match);
  return hs > as ? "home" : hs < as ? "away" : "draw";
}

/** Hit rate of pre-match predictions over all finished matches (no future data leaks in). */
export function backtest() {
  const finished = MATCHES.filter((m) => m.status === "finished");
  let hits = 0;
  let exact = 0;
  for (const m of finished) {
    const p = predictMatch(m);
    if (p.pick === actualOutcome(m)) hits++;
    const [hs, as] = score(m);
    if (p.predicted[0] === hs && p.predicted[1] === as) exact++;
  }
  return {
    total: finished.length,
    hits,
    exact,
    rate: finished.length ? hits / finished.length : 0,
  };
}

export type Projection = {
  teamId: string;
  points: number;
  projected: number;
  pFirst: number;
  pTop3: number;
  avgRank: number;
};

/** Monte Carlo simulation of every remaining match to project the final table. */
export function simulateSeason(runs = 3000): {
  rows: Projection[];
  remaining: number;
  runs: number;
} {
  const finished = MATCHES.filter((m) => m.status === "finished");
  const remainingMatches = MATCHES.filter((m) => m.status !== "finished");
  const { ratings, avg } = ratingsFrom(finished);
  const base = computeStandings(MATCHES);
  const rng = createRng(20250913);
  const stats: Record<string, { pts: number; first: number; top3: number; rank: number }> =
    Object.fromEntries(TEAMS.map((t) => [t.id, { pts: 0, first: 0, top3: 0, rank: 0 }]));
  for (let run = 0; run < runs; run++) {
    const table = Object.fromEntries(
      base.map((r) => [r.teamId, { pts: r.points, gd: r.gf - r.ga, gf: r.gf }]),
    );
    for (const m of remainingMatches) {
      const [curH, curA] = m.status === "live" ? score(m) : [0, 0];
      const frac = m.status === "live" ? (90 - (m.startMinute ?? 0)) / 90 : 1;
      const hs =
        curH +
        rng.poisson(avg * ratings[m.home].attack * ratings[m.away].defense * HOME_ADV * frac);
      const as = curA + rng.poisson(avg * ratings[m.away].attack * ratings[m.home].defense * frac);
      const H = table[m.home];
      const A = table[m.away];
      H.gd += hs - as;
      A.gd += as - hs;
      H.gf += hs;
      A.gf += as;
      if (hs > as) H.pts += 3;
      else if (hs < as) A.pts += 3;
      else {
        H.pts++;
        A.pts++;
      }
    }
    const order = Object.entries(table).sort(
      ([, x], [, y]) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || rng.next() - 0.5,
    );
    order.forEach(([id, r], i) => {
      const s = stats[id];
      s.pts += r.pts;
      s.rank += i + 1;
      if (i === 0) s.first++;
      if (i < 3) s.top3++;
    });
  }
  const rows = base
    .map((r) => ({
      teamId: r.teamId,
      points: r.points,
      projected: stats[r.teamId].pts / runs,
      pFirst: stats[r.teamId].first / runs,
      pTop3: stats[r.teamId].top3 / runs,
      avgRank: stats[r.teamId].rank / runs,
    }))
    .sort((x, y) => y.pFirst - x.pFirst || x.avgRank - y.avgRank);
  return { rows, remaining: remainingMatches.length, runs };
}
