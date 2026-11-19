import { createRng, hashString } from "./random";
import { CURRENT_ROUND, MATCHES, score, type Match } from "./league";
import { TEAMS, TEAM_MAP } from "./teams";

/* ---------- City cheer board (test data) ---------- */
export const CHEER_BASE: Record<string, number> = Object.fromEntries(
  TEAMS.map((t) => [t.id, 180000 + createRng(hashString("cheer-" + t.id)).int(0, 620000)]),
);
export const CHEER_DAILY_LIMIT = 20;

/* ---------- Prediction leaderboard (test data) ---------- */
const NICKS = [
  "长沙伢子",
  "雁城鱼粉控",
  "巴陵老球迷",
  "莲城看台",
  "宝庆霸得蛮",
  "桃花源里人",
  "张家界山哥",
  "银城擂茶",
  "林城东江鱼",
  "潇湘夜雨",
  "鹤城飞起来",
  "湘中硬核",
  "边城少年",
  "火车头一号",
  "岳麓山下",
  "橘子洲头",
  "湘江北去",
  "猪血丸子",
  "芙蓉国里",
];
export const LEADERBOARD = NICKS.map((nick, i) => {
  const rng = createRng(hashString("lb-" + nick));
  return {
    id: `u${i}`,
    nick,
    teamId: TEAMS[i % TEAMS.length].id,
    points: rng.int(180, 980),
    hits: rng.int(4, 22),
  };
}).sort((a, b) => b.points - a.points);

/** Settled guesses shown in "my guesses" so the prototype has history. */
export const SEED_GUESS_HISTORY = MATCHES.filter(
  (m) => m.status === "finished" && m.round >= CURRENT_ROUND - 2,
)
  .slice(0, 5)
  .map((m, i) => {
    const [hs, as] = score(m);
    const guess: [number, number] =
      i % 3 === 0 ? [hs, as] : i % 3 === 1 ? [hs + 1, as] : [as, hs + 1];
    return { match: m, guess };
  });
export const SEED_POINTS = 120;

export function guessPoints(m: Match, guess: [number, number]) {
  const [hs, as] = score(m);
  if (guess[0] === hs && guess[1] === as) return 30;
  const o = (x: number, y: number) => Math.sign(x - y);
  return o(guess[0], guess[1]) === o(hs, as) ? 10 : 0;
}

/* ---------- Discover: tourism (test data) ---------- */
export const DEALS = TEAMS.map((t, i) => ({
  teamId: t.id,
  title: `凭湘超球票游${t.sight}`,
  detail: i % 3 === 0 ? "门票 5 折" : i % 3 === 1 ? "门票 8 折 + 免费讲解" : "当日免票",
  food: `${t.food}套餐 9 折`,
}));

export const WATCH_SPOTS = TEAMS.slice(0, 8).map((t, i) => ({
  teamId: t.id,
  name: `${t.city}市民广场观赛点`,
  detail: i % 2 === 0 ? "大屏直播 · 可容纳 3000 人" : "大屏直播 · 球迷互动区",
}));
