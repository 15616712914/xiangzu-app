import { Heart } from "lucide-react";
import { useMemo } from "react";
import { Crest } from "../components/ui";
import { MATCHES, computeStandings } from "../data/league";
import { TEAMS } from "../data/teams";
import { useApp } from "../state";

export function TeamsScreen({ embedded = false }: { embedded?: boolean }) {
  const app = useApp();
  const rank = useMemo(
    () => Object.fromEntries(computeStandings(MATCHES).map((r, i) => [r.teamId, i + 1])),
    [],
  );
  return (
    <div className={embedded ? "" : "px-5 pt-5"}>
      {!embedded && (
        <>
          <h1 className="text-[26px] font-black tracking-tight text-ink">十四市州</h1>
          <p className="mt-0.5 text-[12px] text-ink/45">为城市荣誉而战 · 点击查看球队与城市名片</p>
        </>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {TEAMS.map((team) => (
          <button
            key={team.id}
            type="button"
            onClick={() => app.open({ type: "team", id: team.id })}
            className="relative overflow-hidden rounded-2xl p-4 text-left text-white transition active:scale-[0.98]"
            style={{
              background: `linear-gradient(150deg, ${team.color}, color-mix(in srgb, ${team.color} 60%, #000))`,
            }}
          >
            <div className="pointer-events-none absolute -right-3 -bottom-6 text-[84px] leading-none font-black opacity-10">
              {team.alias[0]}
            </div>
            <div className="flex items-start justify-between">
              <Crest team={team} size={38} />
              {app.favTeam === team.id && <Heart size={16} fill="currentColor" />}
            </div>
            <div className="mt-6 text-[18px] font-black">{team.city}</div>
            <div className="mt-0.5 flex items-center justify-between text-[12px] text-white/70">
              <span>{team.alias}</span>
              <span className="font-display text-[14px] font-semibold">第 {rank[team.id]} 名</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
