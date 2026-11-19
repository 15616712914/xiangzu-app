import { Heart, Landmark, MapPin, UtensilsCrossed } from "lucide-react";
import { useMemo, useState } from "react";
import { Crest, MatchCard, Overlay, SectionTitle } from "../components/ui";
import { PhotoWall } from "../components/PhotoWall";
import { RankChart } from "../components/RankChart";
import { PlayerPortrait } from "../components/PlayerPortrait";
import { MATCHES, SQUADS, computeStandings } from "../data/league";
import { TEAM_MAP, type Position } from "../data/teams";
import { useApp } from "../state";

const POSITIONS: Position[] = ["门将", "后卫", "中场", "前锋"];

export function TeamDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const app = useApp();
  const team = TEAM_MAP[id];
  const [tab, setTab] = useState<"schedule" | "wall" | "squad">("schedule");
  const standings = useMemo(() => computeStandings(MATCHES), []);
  const rank = standings.findIndex((r) => r.teamId === id);
  const row = standings[rank];
  const matches = MATCHES.filter((m) => m.home === id || m.away === id);
  const isFav = app.favTeam === id;

  return (
    <Overlay
      onBack={onBack}
      tone="dark"
      share={{
        title: `湘超 · ${team.city}队`,
        text: `我在湘超支持${team.city}队！“${team.slogan}”`,
      }}
    >
      <div
        className="relative overflow-hidden px-5 pt-16 pb-6 text-white"
        style={{
          background: `linear-gradient(160deg, ${team.color}, color-mix(in srgb, ${team.color} 45%, #000))`,
        }}
      >
        <div className="pointer-events-none absolute -top-4 -right-6 text-[180px] leading-none font-black opacity-10">
          {team.alias[0]}
        </div>
        <div className="relative flex items-center gap-4">
          <Crest team={team} size={72} />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] text-white/60">{team.alias} · 湘超</div>
            <h1 className="text-[28px] leading-tight font-black">{team.city}队</h1>
            <div className="mt-0.5 truncate text-[13px] text-white/75">“{team.slogan}”</div>
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-4 rounded-2xl bg-black/20 py-3 text-center backdrop-blur-sm">
          {[
            ["排名", rank + 1],
            ["积分", row.points],
            ["战绩", `${row.won}-${row.drawn}-${row.lost}`],
            ["进球", row.gf],
          ].map(([label, v]) => (
            <div key={label}>
              <div className="font-display text-[22px] leading-none font-bold">{v}</div>
              <div className="mt-1 text-[11px] text-white/55">{label}</div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            app.setFavTeam(isFav ? null : id);
            app.toast(isFav ? "已取消主队" : `已将${team.city}设为主队`);
          }}
          className={`relative mt-4 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[14px] font-bold transition ${isFav ? "bg-white/15 text-white" : "bg-white text-ink"}`}
        >
          <Heart size={16} fill={isFav ? "currentColor" : "none"} />
          {isFav ? "已设为我的主队" : "设为我的主队"}
        </button>
      </div>

      <div className="px-5 pt-6 pb-10">
        <RankChart teamId={id} />
        <div className="h-6" />
        <SectionTitle>城市名片</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {[
            [MapPin, "主场", team.stadium],
            [UtensilsCrossed, "必吃", team.food],
            [Landmark, "必游", team.sight],
          ].map(([Icon, label, value]) => {
            const I = Icon as typeof MapPin;
            return (
              <div key={label as string} className="rounded-2xl bg-white p-3 shadow-soft">
                <I size={16} style={{ color: team.color }} />
                <div className="mt-2 text-[11px] text-ink/40">{label as string}</div>
                <div className="mt-0.5 text-[13px] leading-snug font-bold text-ink">
                  {value as string}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-5 border-b border-ink/8">
          {(
            [
              ["schedule", "赛程"],
              ["wall", "照片墙"],
              ["squad", "球员名单"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 pb-2.5 text-[15px] font-bold transition ${tab === key ? "border-chili text-ink" : "border-transparent text-ink/40"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "wall" && <PhotoWall teamId={id} />}
        {tab === "schedule" && (
          <div className="mt-4 space-y-2.5">
            {matches.map((m) => (
              <div key={m.id}>
                <div className="mb-1 text-[11px] font-semibold text-ink/40">第{m.round}轮</div>
                <MatchCard
                  match={m}
                  liveMinute={app.liveMinute}
                  reminded={app.reminders.includes(m.id)}
                  onToggleRemind={() => app.toggleRemind(m.id)}
                  onOpen={() => app.open({ type: "match", id: m.id })}
                />
              </div>
            ))}
          </div>
        )}
        {tab === "squad" && (
          <div className="mt-4 space-y-5">
            <p className="text-[12px] leading-relaxed text-ink/45">
              湘超球员大多来自各行各业，白天上班、晚上训练，为家乡而战。
            </p>
            {POSITIONS.map((pos) => (
              <div key={pos}>
                <div className="mb-2 text-[13px] font-black text-ink">{pos}</div>
                <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
                  {SQUADS[id]
                    .filter((p) => p.position === pos)
                    .sort((a, b) => a.number - b.number)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => app.open({ type: "player", id: p.id })}
                        className="flex w-full items-center gap-3 border-b border-ink/5 px-4 py-2 text-left last:border-0"
                      >
                        <PlayerPortrait player={p} className="size-9 shrink-0 rounded-full" />
                        <span
                          className="w-6 font-display text-[18px] font-bold"
                          style={{ color: team.color }}
                        >
                          {p.number}
                        </span>
                        <span className="flex-1 text-[14px] font-bold text-ink">{p.name}</span>
                        <span className="text-[12px] text-ink/45">
                          {p.age}岁 · {p.job}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Overlay>
  );
}
