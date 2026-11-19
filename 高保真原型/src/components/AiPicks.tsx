import { Sparkles } from "lucide-react";
import { useMemo } from "react";
import { CURRENT_ROUND, MATCHES } from "../data/league";
import { backtest, predictMatch } from "../data/predict";
import { TEAM_MAP } from "../data/teams";
import { useApp } from "../state";
import { ProbabilityBar } from "./AiPrediction";
import { Crest, SectionTitle } from "./ui";

export function AiPicks() {
  const app = useApp();
  const record = useMemo(() => backtest(), []);
  const picks = useMemo(
    () =>
      MATCHES.filter((m) => m.round >= CURRENT_ROUND && m.status === "upcoming")
        .slice(0, 6)
        .map((m) => ({ m, p: predictMatch(m) })),
    [],
  );

  return (
    <section className="pt-7">
      <div className="px-5">
        <SectionTitle
          kicker="AI Picks"
          action={
            <span className="text-[11px] text-ink/45">
              本季胜平负命中 {record.hits}/{record.total}
            </span>
          }
        >
          <span className="flex items-center gap-1.5">
            AI 预测
            <Sparkles size={15} className="text-chili" />
          </span>
        </SectionTitle>
      </div>
      <div className="no-scrollbar -mb-4 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pt-1 pb-6">
        {picks.map(({ m, p }) => {
          const home = TEAM_MAP[m.home];
          const away = TEAM_MAP[m.away];
          const fav =
            p.pick === "home" ? home.city + "胜" : p.pick === "away" ? away.city + "胜" : "平局";
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => app.open({ type: "match", id: m.id, tab: "ai" })}
              className="relative w-[236px] shrink-0 snap-start overflow-hidden rounded-[22px] bg-ink p-4 text-left text-white shadow-[0_10px_20px_-12px_rgba(20,16,17,0.55)] transition active:scale-[0.98]"
            >
              <div
                className="pointer-events-none absolute -top-10 -left-10 size-32 rounded-full blur-2xl"
                style={{ background: home.color, opacity: 0.55 }}
              />
              <div
                className="pointer-events-none absolute -right-10 -bottom-10 size-32 rounded-full blur-2xl"
                style={{ background: away.color, opacity: 0.55 }}
              />
              <div className="relative flex items-center justify-between text-[11px] text-white/50">
                <span>
                  第{m.round}轮 · {m.time}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 font-bold text-gold">
                  置信度{p.confidence}
                </span>
              </div>
              <div className="relative mt-3 flex items-center justify-between">
                <div className="flex w-16 flex-col items-center gap-1">
                  <Crest team={home} size={30} />
                  <span className="text-[13px] font-bold">{home.city}</span>
                </div>
                <span className="font-display text-[38px] leading-none font-bold italic">
                  {p.predicted[0]}
                  <span className="mx-1 text-white/30 not-italic">:</span>
                  {p.predicted[1]}
                </span>
                <div className="flex w-16 flex-col items-center gap-1">
                  <Crest team={away} size={30} />
                  <span className="text-[13px] font-bold">{away.city}</span>
                </div>
              </div>
              <div className="relative mt-3">
                <ProbabilityBar match={m} probs={p.probs} size="sm" />
              </div>
              <div className="relative mt-2 text-[12px] text-white/55">
                主推 <span className="font-bold text-white">{fav}</span> ·{" "}
                {Math.round(p.probs[p.pick] * 100)}%
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
