import { Bot, ChevronRight, Flame, Megaphone, Trophy } from "lucide-react";
import { useMemo } from "react";
import { Crest, SectionTitle, PageHeader, Sheet } from "../components/ui";
import {
  CHEER_BASE,
  CHEER_DAILY_LIMIT,
  LEADERBOARD,
  SEED_GUESS_HISTORY,
  SEED_POINTS,
  guessPoints,
} from "../data/fans";
import { CURRENT_ROUND, MATCHES } from "../data/league";
import { TEAMS, TEAM_MAP } from "../data/teams";
import { useApp } from "../state";

export function useMyPoints() {
  const app = useApp();
  if (!app.user) return 0;
  return SEED_POINTS + SEED_GUESS_HISTORY.reduce((s, h) => s + guessPoints(h.match, h.guess), 0);
}

function formatCount(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString();
}

export function FansScreen() {
  const app = useApp();
  const points = useMyPoints();
  const board = useMemo(
    () =>
      TEAMS.map((t) => ({ team: t, count: CHEER_BASE[t.id] + (app.cheers[t.id] ?? 0) })).sort(
        (a, b) => b.count - a.count,
      ),
    [app.cheers],
  );
  const max = board[0].count;
  const fav = app.favTeam ? TEAM_MAP[app.favTeam] : null;
  const left = CHEER_DAILY_LIMIT - app.cheersToday;
  const upcoming = MATCHES.filter((m) => m.round >= CURRENT_ROUND && m.status === "upcoming").slice(
    0,
    5,
  );
  const lb = app.user
    ? [
        ...LEADERBOARD,
        { id: "me", nick: app.user.nick, teamId: app.favTeam ?? "cs", points, hits: 3 },
      ].sort((a, b) => b.points - a.points)
    : LEADERBOARD;
  const myRank = lb.findIndex((u) => u.id === "me") + 1;

  return (
    <div>
      <PageHeader kicker="Fan Zone" title="球迷" subtitle="为城市打 call · 竞猜赢积分 · 和 AI 聊球">
        <div className="grid grid-cols-3 divide-x divide-white/10 rounded-2xl bg-white/6 py-3 text-center ring-1 ring-white/10">
          <div>
            <div className="font-display text-[24px] leading-none font-bold text-gold">
              {app.user ? points : "—"}
            </div>
            <div className="mt-1 text-[11px] text-white/50">我的积分</div>
          </div>
          <div>
            <div className="font-display text-[24px] leading-none font-bold">
              {app.user ? `#${myRank}` : "—"}
            </div>
            <div className="mt-1 text-[11px] text-white/50">竞猜排名</div>
          </div>
          <div>
            <div className="font-display text-[24px] leading-none font-bold">{left}</div>
            <div className="mt-1 text-[11px] text-white/50">今日助威</div>
          </div>
        </div>
      </PageHeader>
      <Sheet>
        <button
          type="button"
          onClick={() => app.open({ type: "chat", id: "ai" })}
          className="flex w-full items-center gap-3 overflow-hidden rounded-[20px] bg-ink p-4 text-left text-white shadow-float"
          style={{
            backgroundImage:
              "radial-gradient(circle at 100% 0%, rgba(215,38,30,0.6), transparent 60%)",
          }}
        >
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10">
            <Bot size={22} className="text-amber-300" />
          </span>
          <div className="flex-1">
            <div className="text-[16px] font-black">AI 球评助手</div>
            <div className="text-[12px] text-white/55">问状态、问排名、问预测，随时聊湘超</div>
          </div>
          <ChevronRight size={18} className="text-white/40" />
        </button>

        <section className="mt-6">
          <SectionTitle
            action={<span className="text-[11px] text-ink/40">今日剩余 {left} 次</span>}
          >
            <span className="flex items-center gap-1.5">
              城市助威榜 <Flame size={15} className="text-chili" />
            </span>
          </SectionTitle>
          {fav ? (
            <button
              type="button"
              disabled={left <= 0}
              onClick={() => {
                if (!app.requireLogin()) return;
                app.cheer(fav.id);
              }}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-black text-white transition active:scale-[0.98] disabled:opacity-50"
              style={{
                background: `linear-gradient(120deg, ${fav.color}, color-mix(in srgb, ${fav.color} 60%, #000))`,
              }}
            >
              <Megaphone size={18} />
              {left > 0 ? `为${fav.city}助威 +1` : "今日助威次数已用完"}
              {(app.cheers[fav.id] ?? 0) > 0 && (
                <span className="text-[12px] font-bold opacity-75">
                  （我已助威 {app.cheers[fav.id]}）
                </span>
              )}
            </button>
          ) : (
            <p className="mb-3 rounded-2xl bg-white p-3 text-[13px] text-ink/50 shadow-soft">
              在「我的」选择主队后即可为城市助威
            </p>
          )}
          <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
            {board.map(({ team, count }, i) => (
              <button
                key={team.id}
                type="button"
                onClick={() => app.open({ type: "team", id: team.id })}
                className={`flex w-full items-center gap-3 border-b border-ink/5 px-4 py-2.5 text-left last:border-0 ${team.id === app.favTeam ? "bg-chili/6" : ""}`}
              >
                <span
                  className={`w-5 font-display text-[16px] font-bold ${i < 3 ? "text-chili" : "text-ink/35"}`}
                >
                  {i + 1}
                </span>
                <Crest team={team} size={22} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[14px] font-bold text-ink">{team.city}</span>
                    <span className="text-[12px] text-ink/50 tabular-nums">
                      {formatCount(count)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(count / max) * 100}%`, background: team.color }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <SectionTitle action={<span className="text-[11px] text-ink/40">开赛前可修改</span>}>
            本轮竞猜
          </SectionTitle>
          <div className="space-y-2">
            {upcoming.map((m) => {
              const g = app.guesses[m.id];
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => app.open({ type: "match", id: m.id })}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-soft"
                >
                  <Crest team={TEAM_MAP[m.home]} size={22} />
                  <span className="flex-1 text-[14px] font-bold text-ink">
                    {TEAM_MAP[m.home].city} vs {TEAM_MAP[m.away].city}
                  </span>
                  <Crest team={TEAM_MAP[m.away]} size={22} />
                  <span
                    className={`ml-1 rounded-full px-2.5 py-1 text-[12px] font-bold ${g ? "bg-ink text-white" : "bg-chili/10 text-chili"}`}
                  >
                    {g ? `已猜 ${g[0]}:${g[1]}` : "去竞猜"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <SectionTitle
            action={
              app.user ? (
                <span className="text-[11px] text-ink/45">我的排名 第{myRank}</span>
              ) : undefined
            }
          >
            <span className="flex items-center gap-1.5">
              竞猜排行榜 <Trophy size={15} className="text-amber-500" />
            </span>
          </SectionTitle>
          <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
            {lb.slice(0, 10).map((u, i) => (
              <div
                key={u.id}
                className={`flex items-center gap-3 border-b border-ink/5 px-4 py-2.5 last:border-0 ${u.id === "me" ? "bg-chili/6" : ""}`}
              >
                <span
                  className={`w-5 font-display text-[16px] font-bold ${i < 3 ? "text-amber-500" : "text-ink/35"}`}
                >
                  {i + 1}
                </span>
                <Crest team={TEAM_MAP[u.teamId]} size={22} />
                <span className="flex-1 text-[14px] font-bold text-ink">
                  {u.nick}
                  {u.id === "me" && <span className="ml-1 text-[11px] text-chili">我</span>}
                </span>
                <span className="font-display text-[17px] font-bold text-ink">{u.points}</span>
                <span className="text-[11px] text-ink/35">分</span>
              </div>
            ))}
          </div>
          {!app.user && (
            <button
              type="button"
              onClick={() => app.open({ type: "login", id: "me" })}
              className="mt-2 w-full rounded-xl bg-ink/5 py-2.5 text-[13px] font-bold text-ink/60"
            >
              登录后参与排名
            </button>
          )}
        </section>
        <p className="mt-5 text-[11px] leading-relaxed text-ink/35">
          竞猜积分仅用于社区排名，不可兑换现金，请勿用于任何形式的博彩。榜单为测试数据。
        </p>
      </Sheet>
    </div>
  );
}
