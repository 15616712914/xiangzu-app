import { ImageOff } from "lucide-react";
import { useMemo } from "react";
import { PlayerPortrait } from "../components/PlayerPortrait";
import { Crest, Overlay, SectionTitle } from "../components/ui";
import { PLAYER_MAP, SQUADS, computePlayerStats, isStarter } from "../data/league";
import { TEAM_MAP } from "../data/teams";
import { useApp } from "../state";

export function PlayerDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const app = useApp();
  const player = PLAYER_MAP[id];
  const team = TEAM_MAP[player.teamId];
  const stats = useMemo(() => computePlayerStats(id), [id]);
  const teammates = SQUADS[team.id].filter((p) => p.id !== id && p.position === player.position);

  const info: [string, string][] = [
    ["年龄", `${player.age} 岁`],
    ["身高", `${player.height} cm`],
    ["体重", `${player.weight} kg`],
    ["惯用脚", player.foot],
    ["职业", player.job],
    ["代表", `${team.city}队`],
  ];
  const numbers: [string, number][] = [
    ["出场", stats.appearances],
    ["首发", stats.starts],
    ["进球", stats.goals],
    ["黄牌", stats.yellow],
    ["红牌", stats.red],
  ];

  return (
    <Overlay
      onBack={onBack}
      tone="dark"
      share={{
        title: `湘超 · ${player.name}`,
        text: `${team.city}队 ${player.number}号 ${player.name}，本赛季出场 ${stats.appearances} 次，打进 ${stats.goals} 球`,
      }}
    >
      <div className="relative">
        <PlayerPortrait player={player} className="block aspect-[4/5] w-full" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent px-5 pt-24 pb-5 text-white">
          <button
            type="button"
            onClick={() => app.open({ type: "team", id: team.id })}
            className="flex items-center gap-2 text-[13px] text-white/75"
          >
            <Crest team={team} size={20} />
            {team.city}队 · {player.position}
            {isStarter(id) && (
              <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px]">主力</span>
            )}
          </button>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h1 className="text-[34px] leading-tight font-black">{player.name}</h1>
            <span
              className="font-display text-[64px] leading-[0.8] font-bold italic"
              style={{ color: team.accent }}
            >
              {player.number}
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 pb-12">
        {!player.photo && (
          <div className="mb-5 flex items-center gap-2 rounded-xl bg-ink/5 px-3 py-2.5 text-[12px] text-ink/50">
            <ImageOff size={14} className="shrink-0" />
            暂无球员照片，提供真实照片后将自动替换
          </div>
        )}

        <div className="grid grid-cols-5 rounded-2xl bg-white py-4 shadow-soft">
          {numbers.map(([label, v]) => (
            <div key={label} className="text-center">
              <div
                className="font-display text-[26px] leading-none font-bold"
                style={label === "进球" && v > 0 ? { color: team.color } : undefined}
              >
                {v}
              </div>
              <div className="mt-1 text-[11px] text-ink/45">{label}</div>
            </div>
          ))}
        </div>

        <section className="mt-6">
          <SectionTitle>个人资料</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {info.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white px-3 py-3 shadow-soft">
                <div className="text-[11px] text-ink/40">{label}</div>
                <div className="mt-0.5 truncate text-[14px] font-bold text-ink">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <SectionTitle>进球记录</SectionTitle>
          {stats.goalLog.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-[13px] text-ink/45 shadow-soft">
              本赛季暂无进球
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
              {stats.goalLog.map(({ match, minute, penalty }, i) => {
                const opp = TEAM_MAP[match.home === team.id ? match.away : match.home];
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => app.open({ type: "match", id: match.id })}
                    className="flex w-full items-center gap-3 border-b border-ink/5 px-4 py-3 text-left last:border-0"
                  >
                    <span className="w-12 text-[12px] text-ink/40">第{match.round}轮</span>
                    <Crest team={opp} size={20} />
                    <span className="flex-1 text-[14px] font-medium text-ink">
                      {match.home === team.id ? "主场" : "客场"} vs {opp.city}
                    </span>
                    <span className="font-display text-[15px] font-bold text-ink/70">
                      {minute}'{penalty && <span className="ml-1 text-[11px] text-chili">点</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {teammates.length > 0 && (
          <section className="mt-6">
            <SectionTitle>同位置队友</SectionTitle>
            <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5">
              {teammates.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => app.open({ type: "player", id: p.id })}
                  className="w-24 shrink-0 overflow-hidden rounded-2xl bg-white text-left shadow-soft"
                >
                  <PlayerPortrait player={p} className="block aspect-[3/4] w-full" />
                  <div className="px-2 py-1.5">
                    <div className="truncate text-[13px] font-bold text-ink">{p.name}</div>
                    <div className="text-[11px] text-ink/40">{p.number}号</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </Overlay>
  );
}
