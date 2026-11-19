import { useMemo, useState } from "react";
import { Crest, PageHeader, Sheet, DarkSegments } from "../components/ui";
import { SeasonProjection } from "../components/SeasonProjection";
import { TeamsScreen } from "./TeamsScreen";
import { CURRENT_ROUND, MATCHES, computeScorers, computeStandings } from "../data/league";
import { TEAM_MAP } from "../data/teams";
import { useApp } from "../state";

const FORM_STYLE = { W: "bg-emerald-500", D: "bg-ink/25", L: "bg-chili" };
const FORM_LABEL = { W: "胜", D: "平", L: "负" };

export function TableScreen() {
  const app = useApp();
  const [tab, setTab] = useState<"table" | "scorers" | "teams" | "ai">("table");
  const standings = useMemo(() => computeStandings(MATCHES), []);
  const scorers = useMemo(() => computeScorers(MATCHES).slice(0, 20), []);

  return (
    <div>
      <PageHeader
        kicker="Standings & Stats"
        title="数据"
        subtitle={`截至第 ${CURRENT_ROUND} 轮已完赛场次`}
      >
        <DarkSegments
          value={tab}
          onChange={setTab}
          options={[
            ["table", "积分榜"],
            ["scorers", "射手榜"],
            ["teams", "球队"],
            ["ai", "AI推演"],
          ]}
        />
      </PageHeader>
      <Sheet>
        {tab === "ai" && <SeasonProjection />}
        {tab === "teams" && (
          <div className="mt-4">
            <TeamsScreen embedded />
          </div>
        )}
        {tab === "table" && (
          <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-soft">
            <div className="grid grid-cols-[28px_1fr_26px_26px_26px_40px_36px] items-center gap-1 border-b border-ink/5 px-3 py-2.5 text-[11px] font-semibold text-ink/40">
              <span>#</span>
              <span>球队</span>
              <span className="text-center">胜</span>
              <span className="text-center">平</span>
              <span className="text-center">负</span>
              <span className="text-center">净胜</span>
              <span className="text-right">积分</span>
            </div>
            {standings.map((row, i) => {
              const team = TEAM_MAP[row.teamId];
              const fav = row.teamId === app.favTeam;
              const gd = row.gf - row.ga;
              return (
                <button
                  key={row.teamId}
                  type="button"
                  onClick={() => app.open({ type: "team", id: row.teamId })}
                  className={`grid w-full grid-cols-[28px_1fr_26px_26px_26px_40px_36px] items-center gap-1 border-b border-ink/5 px-3 py-2.5 text-left last:border-0 ${fav ? "bg-chili/8" : "hover:bg-paper/60"}`}
                >
                  <span
                    className={`font-display text-[16px] font-bold ${i < 3 ? "text-chili" : "text-ink/40"}`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <Crest team={team} size={22} />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-bold text-ink">
                        {team.city}
                      </span>
                      <span className="mt-0.5 flex gap-0.5">
                        {row.form.map((f, j) => (
                          <span
                            key={j}
                            title={FORM_LABEL[f]}
                            className={`size-1.5 rounded-full ${FORM_STYLE[f]}`}
                          />
                        ))}
                      </span>
                    </span>
                  </span>
                  <span className="text-center text-[13px] text-ink/70 tabular-nums">
                    {row.won}
                  </span>
                  <span className="text-center text-[13px] text-ink/70 tabular-nums">
                    {row.drawn}
                  </span>
                  <span className="text-center text-[13px] text-ink/70 tabular-nums">
                    {row.lost}
                  </span>
                  <span className="text-center text-[13px] text-ink/70 tabular-nums">
                    {gd > 0 ? `+${gd}` : gd}
                  </span>
                  <span className="text-right font-display text-[18px] font-bold text-ink tabular-nums">
                    {row.points}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {tab === "scorers" && (
          <div className="mt-4 space-y-2">
            {scorers.map((s, i) => {
              const team = TEAM_MAP[s.player.teamId];
              return (
                <button
                  key={s.player.id}
                  type="button"
                  onClick={() => app.open({ type: "player", id: s.player.id })}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ${i === 0 ? "bg-ink text-white" : "bg-white shadow-soft"}`}
                >
                  <span
                    className={`w-6 font-display text-[18px] font-bold ${i === 0 ? "text-chili" : i < 3 ? "text-chili" : "text-ink/35"}`}
                  >
                    {i + 1}
                  </span>
                  <Crest team={team} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-bold">{s.player.name}</div>
                    <div
                      className={`truncate text-[12px] ${i === 0 ? "text-white/50" : "text-ink/45"}`}
                    >
                      {team.city} · {s.player.number}号 · {s.player.job}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-[24px] leading-none font-bold">{s.goals}</div>
                    <div className={`text-[10px] ${i === 0 ? "text-white/40" : "text-ink/35"}`}>
                      {s.penalties ? `含${s.penalties}点球` : "进球"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Sheet>
    </div>
  );
}
