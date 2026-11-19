import { Sparkles } from "lucide-react";
import { useMemo } from "react";
import { simulateSeason } from "../data/predict";
import { TEAM_MAP } from "../data/teams";
import { useApp } from "../state";
import { AI_DISCLAIMER } from "./AiPrediction";
import { Crest } from "./ui";

function fmt(p: number) {
  if (p === 0) return "—";
  if (p < 0.005) return "<1%";
  return `${Math.round(p * 100)}%`;
}

export function SeasonProjection() {
  const app = useApp();
  const { rows, remaining, runs } = useMemo(() => simulateSeason(), []);
  const leader = rows[0];

  return (
    <div className="mt-4 space-y-3">
      <div className="relative overflow-hidden rounded-[22px] bg-ink p-5 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-45"
          style={{
            background: `radial-gradient(circle at 90% 10%, ${TEAM_MAP[leader.teamId].color}, transparent 55%)`,
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-1.5 text-[13px] font-bold">
            <Sparkles size={15} className="text-amber-300" />
            AI 赛季推演
          </div>
          <p className="mt-1 text-[12px] text-white/55">
            对剩余 {remaining} 场比赛模拟 {runs.toLocaleString()} 次
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Crest team={TEAM_MAP[leader.teamId]} size={48} />
            <div>
              <div className="text-[12px] text-white/55">最有希望登顶</div>
              <div className="text-[22px] font-black">{TEAM_MAP[leader.teamId].city}队</div>
            </div>
            <div className="ml-auto text-right">
              <div className="font-display text-[40px] leading-none font-bold">
                {fmt(leader.pFirst)}
              </div>
              <div className="text-[11px] text-white/55">登顶概率</div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="grid grid-cols-[1fr_44px_52px_88px] items-center gap-2 border-b border-ink/5 px-3 py-2.5 text-[11px] font-semibold text-ink/40">
          <span>球队</span>
          <span className="text-center">现积分</span>
          <span className="text-center">预计</span>
          <span className="text-right">登顶 / 前三</span>
        </div>
        {rows.map((r) => {
          const team = TEAM_MAP[r.teamId];
          return (
            <button
              key={r.teamId}
              type="button"
              onClick={() => app.open({ type: "team", id: r.teamId })}
              className={`grid w-full grid-cols-[1fr_44px_52px_88px] items-center gap-2 border-b border-ink/5 px-3 py-2.5 text-left last:border-0 ${r.teamId === app.favTeam ? "bg-chili/8" : ""}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Crest team={team} size={22} />
                <span className="truncate text-[14px] font-bold text-ink">{team.city}</span>
              </span>
              <span className="text-center text-[13px] text-ink/60 tabular-nums">{r.points}</span>
              <span className="text-center font-display text-[16px] font-bold text-ink">
                {r.projected.toFixed(1)}
              </span>
              <span className="flex flex-col items-end gap-1">
                <span className="text-[12px] font-bold text-ink tabular-nums">
                  {fmt(r.pFirst)} <span className="font-normal text-ink/35">/ {fmt(r.pTop3)}</span>
                </span>
                <span className="h-1 w-full overflow-hidden rounded-full bg-ink/6">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${r.pTop3 * 100}%`, background: team.color }}
                  />
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="px-1 text-[11px] leading-relaxed text-ink/40">{AI_DISCLAIMER}</p>
    </div>
  );
}
