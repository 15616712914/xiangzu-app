import { Check, Home, Shield, Sparkles, Swords, TrendingUp, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { score, type Match } from "../data/league";
import { actualOutcome, predictMatch, type Outcome } from "../data/predict";
import { TEAM_MAP } from "../data/teams";
import { useApp } from "../state";

export const AI_DISCLAIMER =
  "预测由数据模型基于历史赛果生成，仅供娱乐参考，请勿用于任何形式的博彩。";

function useTypewriter(text: string, delay = 650) {
  const [ready, setReady] = useState(false);
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);
  useEffect(() => {
    if (!ready || n >= text.length) return;
    const t = window.setTimeout(() => setN((x) => x + 2), 24);
    return () => window.clearTimeout(t);
  }, [ready, n, text.length]);
  return { ready, shown: text.slice(0, n), done: n >= text.length };
}

function pct(p: number) {
  return Math.round(p * 100);
}

export function ProbabilityBar({
  match,
  probs,
  size = "md",
}: {
  match: Match;
  probs: Record<Outcome, number>;
  size?: "sm" | "md";
}) {
  const home = TEAM_MAP[match.home];
  const away = TEAM_MAP[match.away];
  const parts: [Outcome, string, string][] = [
    ["home", home.color, `${home.city}胜`],
    ["draw", "#a39a91", "平局"],
    ["away", away.color, `${away.city}胜`],
  ];
  return (
    <div>
      <div
        className={`flex gap-0.5 overflow-hidden rounded-full ${size === "sm" ? "h-1.5" : "h-2.5"}`}
      >
        {parts.map(([k, color]) => (
          <div
            key={k}
            className="h-full transition-all duration-700"
            style={{ width: `${probs[k] * 100}%`, background: color }}
          />
        ))}
      </div>
      {size === "md" && (
        <div className="mt-2 grid grid-cols-3 text-[12px]">
          {parts.map(([k, color, label], i) => (
            <div key={k} className={i === 0 ? "text-left" : i === 1 ? "text-center" : "text-right"}>
              <div
                className="font-display text-[22px] leading-none font-bold"
                style={{ color: k === "draw" ? undefined : color }}
              >
                {pct(probs[k])}%
              </div>
              <div className="mt-0.5 text-white/55">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AiPrediction({ match }: { match: Match }) {
  const app = useApp();
  const minute = match.status === "live" ? app.liveMinute : undefined;
  const p = useMemo(() => predictMatch(match, minute), [match, minute]);
  const home = TEAM_MAP[match.home];
  const away = TEAM_MAP[match.away];
  const { ready, shown, done } = useTypewriter(p.summary);
  const myVote = app.votes[match.id];
  const label = (o: Outcome) =>
    o === "home" ? `${home.city}胜` : o === "away" ? `${away.city}胜` : "平局";

  const verdict =
    match.status === "finished"
      ? { hit: p.pick === actualOutcome(match), actual: score(match) }
      : null;
  const factorIcon = (text: string) =>
    text.includes("进攻")
      ? Swords
      : text.includes("防守")
        ? Shield
        : text.includes("主场")
          ? Home
          : TrendingUp;

  return (
    <div className="mt-4 space-y-3">
      <div className="relative overflow-hidden rounded-[22px] bg-ink p-5 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background: `radial-gradient(circle at 0% 0%, ${home.color}, transparent 50%), radial-gradient(circle at 100% 100%, ${away.color}, transparent 50%)`,
          }}
        />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[13px] font-bold">
              <Sparkles size={15} className="text-amber-300" />
              {match.status === "live"
                ? "AI 实时预测"
                : match.status === "finished"
                  ? "AI 赛前预测"
                  : "AI 赛前预测"}
            </span>
            <span className="rounded-full bg-white/12 px-2 py-0.5 text-[11px] text-white/80">
              置信度 · {p.confidence}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-[12px] text-white/55">
              预测比分
              <div className="mt-1 font-display text-[44px] leading-none font-bold text-white">
                {p.predicted[0]}
                <span className="mx-1.5 text-white/35">:</span>
                {p.predicted[1]}
              </div>
            </div>
            <div className="text-right text-[12px] text-white/55">
              预期进球 xG
              <div className="mt-1 font-display text-[22px] leading-none font-semibold text-white/90">
                {p.xg[0].toFixed(2)} <span className="text-white/35">vs</span> {p.xg[1].toFixed(2)}
              </div>
              <div className="mt-1 text-[11px]">主推 · {label(p.pick)}</div>
            </div>
          </div>

          <div className="mt-5">
            <ProbabilityBar match={match} probs={p.probs} />
          </div>

          {verdict && (
            <div
              className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-bold ${verdict.hit ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-white/70"}`}
            >
              {verdict.hit ? <Check size={14} /> : <X size={14} />}
              实际比分 {verdict.actual[0]}:{verdict.actual[1]} · 胜平负预测
              {verdict.hit ? "命中" : "未命中"}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-soft">
        <div className="flex items-center gap-1.5 text-[14px] font-black text-ink">
          <Sparkles size={14} className="text-chili" />
          AI 解读
        </div>
        {ready ? (
          <p className="mt-2 min-h-[3lh] text-[14px] leading-relaxed text-ink/80">
            {shown}
            {!done && (
              <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-chili" />
            )}
          </p>
        ) : (
          <div className="mt-3 space-y-2" aria-label="分析中">
            <div className="h-3 w-full animate-pulse rounded bg-ink/8" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-ink/8" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-ink/8" />
          </div>
        )}
        {myVote && match.status !== "finished" && (
          <div className="mt-3 rounded-xl bg-paper px-3 py-2 text-[12px] text-ink/60">
            你支持「{label(myVote)}」，AI 主推「{label(p.pick)}」 ·{" "}
            <span className="font-bold text-ink">
              {myVote === p.pick ? "英雄所见略同" : "看法不同，拭目以待"}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {p.likely.map((l, i) => (
          <div key={i} className="rounded-2xl bg-white px-3 py-3 text-center shadow-soft">
            <div className="text-[11px] text-ink/40">可能比分 {i + 1}</div>
            <div className="mt-1 font-display text-[22px] leading-none font-bold text-ink">
              {l.score[0]}:{l.score[1]}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-chili">
              {(l.p * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          ["总进球 3 球及以上", p.over25],
          ["双方都有进球", p.btts],
        ].map(([label, v]) => (
          <div key={label as string} className="rounded-2xl bg-white p-3 shadow-soft">
            <div className="text-[11px] text-ink/45">{label as string}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-display text-[22px] leading-none font-bold text-ink">
                {pct(v as number)}%
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/6">
                <div
                  className="h-full rounded-full bg-ink transition-all duration-700"
                  style={{ width: `${(v as number) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-soft">
        <div className="text-[14px] font-black text-ink">关键因素</div>
        <ul className="mt-2 space-y-2.5">
          {p.factors.map((f, i) => {
            const Icon = factorIcon(f.text);
            const color =
              f.side === "home" ? home.color : f.side === "away" ? away.color : "#17120f";
            return (
              <li key={i} className="flex items-center gap-2.5 text-[13px] text-ink/75">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full"
                  style={{ background: `color-mix(in srgb, ${color} 14%, white)`, color }}
                >
                  <Icon size={14} />
                </span>
                {f.text}
              </li>
            );
          })}
        </ul>
        {p.sample < 3 && (
          <p className="mt-3 text-[11px] text-ink/40">样本场次较少，预测参考价值有限。</p>
        )}
      </div>

      <p className="px-1 text-[11px] leading-relaxed text-ink/40">{AI_DISCLAIMER}</p>
    </div>
  );
}
