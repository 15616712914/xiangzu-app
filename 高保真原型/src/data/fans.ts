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

/* ---------- Match-day info (test data) ---------- */
const WEATHER = [
  { kind: "sun", text: "晴" },
  { kind: "cloud", text: "多云" },
  { kind: "cloud", text: "阴" },
  { kind: "rain", text: "小雨" },
] as const;

export function matchInfo(m: Match) {
  const rng = createRng(hashString("info-" + m.id));
  const w = rng.pick(WEATHER);
  const home = TEAM_MAP[m.home];
  return {
    weather: { ...w, temp: rng.int(12, 26) },
    prices: [30, 60, 100, 180],
    soldPct: m.status === "upcoming" ? rng.int(62, 99) : 100,
    gateOpen: (() => {
      const [h, mi] = m.time.split(":").map(Number);
      return `${String(h - 2).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
    })(),
    transit: `${home.city}市区公交多条线路可达，赛日加开接驳专线`,
    mapUrl: `https://uri.amap.com/search?keyword=${encodeURIComponent(home.stadium)}`,
  };
}

/* ---------- Comments (test data) ---------- */
export type Comment = {
  id: string;
  nick: string;
  teamId: string;
  text: string;
  likes: number;
  ago: string;
  mine?: boolean;
};

export function seedComments(m: Match): Comment[] {
  const rng = createRng(hashString("cm-" + m.id));
  const h = TEAM_MAP[m.home];
  const a = TEAM_MAP[m.away];
  const lines: [string, string][] = [
    [h.id, `${h.city}主场，今天必须拿下！`],
    [a.id, `${a.city}的兄弟们集合，客场一样是主场！`],
    [h.id, `${h.food}配啤酒，坐等开球`],
    [a.id, `赛后去${h.city}吃${h.food}，赢了再加一份`],
    [h.id, `“${h.slogan}”`],
    [a.id, `“${a.slogan}”`],
    [h.id, `现场氛围太好了，看台全是${h.city}人`],
    [a.id, `周末带娃去${h.sight}，顺便看球`],
  ];
  const agos = [
    "刚刚",
    "1分钟前",
    "3分钟前",
    "8分钟前",
    "15分钟前",
    "32分钟前",
    "1小时前",
    "2小时前",
  ];
  return lines.map(([teamId, text], i) => ({
    id: `${m.id}-c${i}`,
    nick: NICKS[(rng.int(0, NICKS.length - 1) + i) % NICKS.length],
    teamId,
    text,
    likes: rng.int(0, 860),
    ago: agos[i],
  }));
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

/* ---------- Notifications (test data) ---------- */
export function seedNotifications(favTeam: string | null) {
  const live = MATCHES.find((m) => m.status === "live")!;
  const fav = favTeam ? TEAM_MAP[favTeam] : TEAM_MAP.cs;
  const favNext = MATCHES.find(
    (m) => m.status === "upcoming" && (m.home === fav.id || m.away === fav.id),
  );
  const goal = live.events.find((e) => e.type === "goal");
  const list = [
    goal && {
      id: "n-goal",
      kind: "goal" as const,
      title: "进球！",
      body: `${TEAM_MAP[live.home].city} vs ${TEAM_MAP[live.away].city}，第${goal.minute}分钟${TEAM_MAP[goal.side === "home" ? live.home : live.away].city}破门`,
      time: "10分钟前",
      target: { type: "match" as const, id: live.id },
    },
    favNext && {
      id: "n-fav",
      kind: "kickoff" as const,
      title: `${fav.city}队比赛预告`,
      body: `第${favNext.round}轮 ${TEAM_MAP[favNext.home].city} vs ${TEAM_MAP[favNext.away].city}，${favNext.time} 开球`,
      time: "1小时前",
      target: { type: "match" as const, id: favNext.id },
    },
    {
      id: "n-guess",
      kind: "guess" as const,
      title: "竞猜结算",
      body: `第${SEED_GUESS_HISTORY[0].match.round}轮竞猜已结算，你猜中了比分，获得 30 积分`,
      time: "昨天",
      target: null,
    },
    {
      id: "n-news",
      kind: "news" as const,
      title: "资讯推荐",
      body: "凭票游景区：十四市州推出观赛文旅大礼包",
      time: "昨天",
      target: { type: "news" as const, id: "n3" },
    },
  ];
  return list.filter(Boolean) as NonNullable<(typeof list)[number]>[];
}
