import { createRng, hashString } from "./random";
import { PLAYER_MAP, SQUADS, score, visibleEvents, type Match } from "./league";
import { TEAM_MAP } from "./teams";

export type CommentaryLine = {
  minute: number;
  text: string;
  kind: "goal" | "card" | "sub" | "info" | "whistle";
};

/** Text commentary built from match events plus filler play-by-play. */
export function commentary(m: Match, liveMinute?: number): CommentaryLine[] {
  const upTo = m.status === "live" ? (liveMinute ?? 0) : m.status === "finished" ? 90 : -1;
  if (upTo < 0) return [];
  const h = TEAM_MAP[m.home];
  const a = TEAM_MAP[m.away];
  const rng = createRng(hashString("cmt-" + m.id));
  const lines: CommentaryLine[] = [
    { minute: 0, kind: "whistle", text: `比赛开始！${h.city}队在主场迎战${a.city}队` },
  ];
  const fillers = [
    (t: string, p: string) => `${t}${p}禁区外远射，皮球稍稍偏出`,
    (t: string) => `${t}获得角球机会`,
    (t: string, p: string) => `${t}${p}送出一脚精妙直塞，可惜队友越位`,
    () => `比赛节奏放缓，双方在中场反复争夺`,
    (t: string, p: string) => `${t}${p}头球攻门，被门将稳稳没收`,
    (t: string) => `${t}看台响起整齐的助威声`,
    (t: string, p: string) => `${t}${p}边路突破后传中，被对方解围`,
  ];
  for (let min = 4; min < 90; min += rng.int(5, 9)) {
    const side = rng.next() < 0.5 ? m.home : m.away;
    const p = rng.pick(SQUADS[side].slice(8, 18));
    lines.push({ minute: min, kind: "info", text: rng.pick(fillers)(TEAM_MAP[side].city, p.name) });
  }
  for (const e of m.events) {
    const t = TEAM_MAP[e.side === "home" ? m.home : m.away];
    const p = PLAYER_MAP[e.playerId];
    if (e.type === "goal") {
      const [hs, as] = score(m, e.minute);
      lines.push({
        minute: e.minute,
        kind: "goal",
        text: `进球！${t.city}${p.name}${e.note === "点球" ? "点球命中" : "破门得分"}，比分 ${hs}:${as}`,
      });
    } else if (e.type === "yellow" || e.type === "red") {
      lines.push({
        minute: e.minute,
        kind: "card",
        text: `${t.city}${p.name}犯规，被出示${e.type === "red" ? "红牌罚下" : "黄牌"}`,
      });
    } else {
      lines.push({ minute: e.minute, kind: "sub", text: `${t.city}换人，${p.name}替补登场` });
    }
  }
  lines.push(
    { minute: 45, kind: "whistle", text: "上半场结束" },
    { minute: 46, kind: "whistle", text: "下半场开始" },
  );
  if (m.status === "finished") {
    const [hs, as] = score(m);
    lines.push({
      minute: 90,
      kind: "whistle",
      text: `全场比赛结束，${h.city} ${hs}:${as} ${a.city}`,
    });
  }
  const order = { info: 0, sub: 1, card: 2, goal: 3, whistle: 4 };
  return lines
    .filter((l) => l.minute <= upTo)
    .sort((x, y) => y.minute - x.minute || order[y.kind] - order[x.kind]);
}

/** Template-based post-match report. */
export function matchReport(m: Match) {
  const [hs, as] = score(m);
  const h = TEAM_MAP[m.home];
  const a = TEAM_MAP[m.away];
  const goals = visibleEvents(m).filter((e) => e.type === "goal");
  const first = goals[0];
  const s = m.stats;
  const title =
    hs === as
      ? `${h.city}${hs}:${as}战平${a.city}，双方各取一分`
      : hs > as
        ? `${h.city}主场${hs}:${as}力克${a.city}`
        : `${a.city}客场${as}:${hs}击败${h.city}`;
  const paras: string[] = [];
  paras.push(
    `湘超第${m.round}轮，${h.city}队坐镇${h.stadium}迎战${a.city}队，现场 ${m.attendance.toLocaleString()} 名球迷见证了这场比赛。`,
  );
  if (first) {
    const fp = PLAYER_MAP[first.playerId];
    const ft = TEAM_MAP[first.side === "home" ? m.home : m.away];
    const others = goals.slice(1).map((g) => `${PLAYER_MAP[g.playerId].name}（${g.minute}'）`);
    paras.push(
      `第${first.minute}分钟，${ft.city}队${fp.name}${first.note === "点球" ? "主罚点球命中" : "抓住机会破门"}，打破僵局。${
        others.length ? `此后${others.join("、")}相继进球。` : ""
      }`,
    );
  } else {
    paras.push("双方互有攻守，但都没能攻破对方球门。");
  }
  const domHome = s.possession[0] >= s.possession[1];
  paras.push(
    `全场${domHome ? h.city : a.city}控球率 ${Math.max(...s.possession)}%，两队射门 ${s.shots[0]}:${s.shots[1]}，射正 ${s.onTarget[0]}:${s.onTarget[1]}。`,
  );
  return { title, paras };
}
