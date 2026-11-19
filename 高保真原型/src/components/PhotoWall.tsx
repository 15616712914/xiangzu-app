import { useMemo, useState } from "react";
import { SQUADS, computePlayerStats, isStarter } from "../data/league";
import { TEAM_MAP, type Position } from "../data/teams";
import { useApp } from "../state";
import { PlayerPortrait } from "./PlayerPortrait";

const FILTERS: ("全部" | Position)[] = ["全部", "门将", "后卫", "中场", "前锋"];

export function PhotoWall({ teamId }: { teamId: string }) {
  const app = useApp();
  const team = TEAM_MAP[teamId];
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("全部");
  const goals = useMemo(
    () => Object.fromEntries(SQUADS[teamId].map((p) => [p.id, computePlayerStats(p.id).goals])),
    [teamId],
  );
  const topScorer = [...SQUADS[teamId]].sort((a, b) => goals[b.id] - goals[a.id])[0];
  const featured = filter === "全部" && goals[topScorer.id] > 0 ? topScorer : null;
  const players = SQUADS[teamId]
    .filter((p) => filter === "全部" || p.position === filter)
    .filter((p) => p.id !== featured?.id)
    .sort((a, b) => Number(isStarter(b.id)) - Number(isStarter(a.id)) || a.number - b.number);

  return (
    <div className="mt-4">
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition ${
              filter === f ? "text-white" : "bg-white text-ink/55 ring-1 ring-ink/8"
            }`}
            style={filter === f ? { background: team.color } : undefined}
          >
            {f}
            <span className="ml-1 opacity-60">
              {f === "全部"
                ? SQUADS[teamId].length
                : SQUADS[teamId].filter((p) => p.position === f).length}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {featured && (
          <button
            type="button"
            onClick={() => app.open({ type: "player", id: featured.id })}
            className="relative col-span-2 row-span-2 overflow-hidden rounded-2xl text-left"
          >
            <PlayerPortrait player={featured} className="block size-full" />
            <span className="absolute top-2.5 left-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-ink">
              队内射手王 · {goals[featured.id]}球
            </span>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-10 pb-3 text-white">
              <div className="text-[18px] font-black">{featured.name}</div>
              <div className="text-[12px] text-white/70">
                {featured.number}号 · {featured.position} · {featured.job}
              </div>
            </div>
          </button>
        )}
        {players.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => app.open({ type: "player", id: p.id })}
            className="group relative overflow-hidden rounded-xl text-left transition active:scale-[0.97]"
          >
            <PlayerPortrait
              player={p}
              className="block aspect-[3/4] w-full transition group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pt-6 pb-1.5 text-white">
              <div className="truncate text-[13px] font-bold">{p.name}</div>
              <div className="text-[10px] text-white/65">
                {p.number}号 · {p.position}
              </div>
            </div>
            {goals[p.id] > 0 && (
              <span className="absolute top-1.5 right-1.5 rounded-full bg-white/90 px-1.5 text-[10px] font-bold text-ink">
                {goals[p.id]}球
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
