import {
  CURRENT_ROUND,
  MATCHES,
  type Match,
  PLAYER_MAP,
  computePlayerStats,
  computeScorers,
  computeStandings,
  formatDate,
  stageLabel,
} from "./league";
import { predictMatch } from "./predict";
import { TEAMS, TEAM_MAP } from "./teams";

export const SUGGESTIONS = [
  "本轮有哪些比赛？",
  "积分榜前五是谁？",
  "射手榜",
  "永州队最近状态怎么样？",
  "预测长沙下一场",
];

const pct = (p: number) => `${Math.round(p * 100)}%`;

/** Rule-based answers over the local dataset. Stands in for an LLM in the prototype. */
export function answer(question: string, matches: Match[] = MATCHES): string {
  const q = question.trim();
  const standings = computeStandings(matches);
  const team = TEAMS.find((t) => q.includes(t.city) || q.includes(t.alias));
  const player = Object.values(PLAYER_MAP).find((p) => q.includes(p.name));

  if (player) {
    const s = computePlayerStats(player.id);
    const t = TEAM_MAP[player.teamId];
    return `${player.name}是${t.city}队的${player.number}号。2026 赛季打进 ${s.goals} 球（点球 ${s.penalties}），${s.yellow} 张黄牌、${s.red} 张红牌。`;
  }

  if (team && /预测|能赢|胜率|下一场|下场/.test(q)) {
    const involves = (m: Match) => m.home === team.id || m.away === team.id;
    const live = matches.find((m) => m.status === "live" && involves(m));
    const next = matches.find((m) => m.status === "upcoming" && involves(m));
    const liveNote = live ? `${team.city}队此刻正在比赛，可以在比赛页查看实时预测。` : "";
    if (!next) return liveNote || `${team.city}队本赛季的比赛已经全部结束。`;
    const p = predictMatch(next, undefined, matches);
    const h = TEAM_MAP[next.home];
    const a = TEAM_MAP[next.away];
    return `${liveNote}${team.city}队下一场是${stageLabel(next)} ${h.city} vs ${a.city}（${formatDate(next.date)} ${next.time}）。模型预测比分 ${p.predicted.join(":")}，${h.city}胜 ${pct(p.probs.home)}、平 ${pct(p.probs.draw)}、${a.city}胜 ${pct(p.probs.away)}，置信度${p.confidence}。`;
  }

  if (team) {
    const idx = standings.findIndex((r) => r.teamId === team.id);
    const r = standings[idx];
    const form = r.form.map((f) => (f === "W" ? "胜" : f === "D" ? "平" : "负")).join("");
    const top = computeScorers(matches).find((s) => s.player.teamId === team.id);
    return `${team.city}队目前排名第 ${idx + 1}，${r.played} 场 ${r.won}胜${r.drawn}平${r.lost}负，积 ${r.points} 分，进 ${r.gf} 球失 ${r.ga} 球。近 ${r.form.length} 场：${form}。${
      top ? `队内头号射手是 ${top.player.name}（${top.goals} 球）。` : ""
    }`;
  }

  if (/射手|进球最多|金靴/.test(q)) {
    const top = computeScorers(matches).slice(0, 5);
    return `射手榜前五：\n${top.map((s, i) => `${i + 1}. ${s.player.name}（${TEAM_MAP[s.player.teamId].city}）${s.goals} 球`).join("\n")}`;
  }

  if (/积分|排名|榜首|第一/.test(q)) {
    return `积分榜前五：\n${standings
      .slice(0, 5)
      .map(
        (r, i) =>
          `${i + 1}. ${TEAM_MAP[r.teamId].city} ${r.points} 分（${r.won}胜${r.drawn}平${r.lost}负）`,
      )
      .join("\n")}`;
  }

  if (/本轮|今天|比赛|赛程/.test(q)) {
    const list = matches.filter((m) => m.round === CURRENT_ROUND);
    return `第 ${CURRENT_ROUND} 轮共 ${list.length} 场：\n${list
      .map(
        (m) =>
          `${formatDate(m.date)} ${m.time} ${TEAM_MAP[m.home].city} vs ${TEAM_MAP[m.away].city}${m.status === "finished" ? "（已完场）" : m.status === "live" ? "（进行中）" : ""}`,
      )
      .join("\n")}`;
  }

  return "我可以回答球队状态、积分排名、射手榜、球员资料和比赛预测，比如“衡阳队最近状态怎么样？”或“预测岳阳下一场”。";
}
