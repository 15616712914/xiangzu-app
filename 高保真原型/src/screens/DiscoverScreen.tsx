import { MapPin, PlayCircle, Ticket, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { Img } from "../components/Img";
import { Crest, DarkSegments, PageHeader, Sheet } from "../components/ui";
import { DEALS, WATCH_SPOTS } from "../data/fans";
import { MATCHES, score } from "../data/league";
import { HERO_IMAGE } from "../data/news";
import { TEAM_MAP } from "../data/teams";
import { useApp } from "../state";
import { NewsScreen } from "./NewsScreen";

type Seg = "news" | "video" | "travel";

export function DiscoverScreen() {
  const [seg, setSeg] = useState<Seg>("news");
  return (
    <div>
      <PageHeader kicker="Discover" title="发现" subtitle="资讯 · 集锦 · 跟着湘超去旅行">
        <DarkSegments
          value={seg}
          onChange={setSeg}
          options={[
            ["news", "资讯"],
            ["video", "集锦"],
            ["travel", "文旅"],
          ]}
        />
      </PageHeader>
      <Sheet flush>
        {seg === "news" && <NewsScreen embedded />}
        {seg === "video" && <Highlights />}
        {seg === "travel" && <Travel />}
      </Sheet>
    </div>
  );
}

function Highlights() {
  const app = useApp();
  const recent = MATCHES.filter((m) => m.status === "finished")
    .slice(-10)
    .reverse();
  return (
    <div className="grid grid-cols-2 gap-3 px-5">
      {recent.map((m, i) => {
        const h = TEAM_MAP[m.home];
        const a = TEAM_MAP[m.away];
        const [hs, as] = score(m);
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => app.open({ type: "match", id: m.id })}
            className="text-left"
          >
            <div
              className="relative flex aspect-video items-center justify-center gap-3 overflow-hidden rounded-xl"
              style={{ background: `linear-gradient(120deg, ${h.color}, #17120f 50%, ${a.color})` }}
            >
              <Crest team={h} size={26} />
              <span className="font-display text-[22px] font-bold text-white">
                {hs}:{as}
              </span>
              <Crest team={a} size={26} />
              <PlayCircle size={28} className="absolute right-2 bottom-2 text-white/85" />
              <span className="absolute top-1.5 left-1.5 rounded bg-black/50 px-1.5 text-[10px] text-white">
                0{2 + (i % 4)}:{String(10 + ((i * 17) % 49)).padStart(2, "0")}
              </span>
            </div>
            <div className="mt-1.5 line-clamp-2 text-[13px] leading-snug font-bold text-ink">
              第{m.round}轮 {h.city} vs {a.city} 全场集锦
            </div>
          </button>
        );
      })}
      <p className="col-span-2 pb-2 text-center text-[11px] text-ink/35">
        集锦为占位内容，正式版将接入授权视频
      </p>
    </div>
  );
}

function Travel() {
  const app = useApp();
  return (
    <div className="px-5">
      <div className="relative overflow-hidden rounded-[22px] bg-ink p-5 text-white">
        <Img
          src={HERO_IMAGE}
          alt="足球场"
          className="absolute inset-0 size-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
        <div className="relative">
          <div className="text-[12px] font-bold text-amber-300">跟着湘超去旅行</div>
          <div className="mt-1 text-[22px] leading-tight font-black">看一场球，逛一座城</div>
          <p className="mt-1 text-[12px] text-white/60">凭当轮球票享景区与美食优惠</p>
        </div>
      </div>

      <h2 className="mt-6 mb-3 text-[16px] font-black text-ink">凭票优惠</h2>
      <div className="space-y-2">
        {DEALS.map((d) => {
          const t = TEAM_MAP[d.teamId];
          return (
            <button
              key={d.teamId}
              type="button"
              onClick={() => app.open({ type: "team", id: t.id })}
              className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-soft"
            >
              <div
                className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl text-white"
                style={{ background: t.color }}
              >
                <span className="text-[15px] leading-none font-black">{t.city.slice(0, 2)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-bold text-ink">{d.title}</div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] text-ink/50">
                  <span className="flex items-center gap-1">
                    <Ticket size={11} />
                    {d.detail}
                  </span>
                  <span className="flex items-center gap-1">
                    <UtensilsCrossed size={11} />
                    {d.food}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <h2 className="mt-6 mb-3 text-[16px] font-black text-ink">球迷观赛点</h2>
      <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
        {WATCH_SPOTS.map((w) => (
          <div
            key={w.name}
            className="flex items-center gap-3 border-b border-ink/5 px-4 py-3 last:border-0"
          >
            <MapPin size={16} style={{ color: TEAM_MAP[w.teamId].color }} />
            <div className="flex-1">
              <div className="text-[14px] font-bold text-ink">{w.name}</div>
              <div className="text-[12px] text-ink/45">{w.detail}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-[11px] text-ink/35">
        优惠与观赛点均为测试数据，以各地官方发布为准
      </p>
    </div>
  );
}
