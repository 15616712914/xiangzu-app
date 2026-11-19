import {
  Cloud,
  CloudRain,
  DoorOpen,
  Heart,
  Minus,
  Navigation,
  PlayCircle,
  Plus,
  Send,
  Sparkles,
  Sun,
  Ticket,
  Tv,
} from "lucide-react";
import { useMemo, useState } from "react";
import { computeStandings, MATCHES, score, type Match } from "../data/league";
import { guessPoints, matchInfo, seedComments } from "../data/fans";
import { commentary, matchReport } from "../data/report";
import { TEAM_MAP } from "../data/teams";
import { useApp } from "../state";
import { Crest } from "./ui";

export function MatchInfoCard({ match }: { match: Match }) {
  const app = useApp();
  const info = matchInfo(match);
  const WeatherIcon =
    info.weather.kind === "sun" ? Sun : info.weather.kind === "rain" ? CloudRain : Cloud;
  const upcoming = match.status === "upcoming";
  return (
    <div className="rounded-2xl bg-white p-4 shadow-soft">
      <div className="grid grid-cols-3 divide-x divide-ink/6 text-center">
        <div>
          <WeatherIcon size={18} className="mx-auto text-amber-500" />
          <div className="mt-1 text-[13px] font-bold text-ink">
            {info.weather.text} {info.weather.temp}°C
          </div>
          <div className="text-[11px] text-ink/40">赛时天气</div>
        </div>
        <div>
          <DoorOpen size={18} className="mx-auto text-ink/50" />
          <div className="mt-1 text-[13px] font-bold text-ink">{info.gateOpen}</div>
          <div className="text-[11px] text-ink/40">开放入场</div>
        </div>
        <div>
          <Ticket size={18} className="mx-auto text-chili" />
          <div className="mt-1 text-[13px] font-bold text-ink">¥{info.prices[0]} 起</div>
          <div className="text-[11px] text-ink/40">
            {upcoming ? `已售 ${info.soldPct}%` : "已售罄"}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[12px] text-ink/45">{info.transit}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <a
          href={info.mapUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1 rounded-xl bg-paper py-2.5 text-[13px] font-bold text-ink"
        >
          <Navigation size={14} />
          导航
        </a>
        <button
          type="button"
          onClick={() =>
            app.toast(
              upcoming ? "原型：将跳转至官方授权售票平台" : "原型：将跳转至授权平台观看集锦",
            )
          }
          className="flex items-center justify-center gap-1 rounded-xl bg-paper py-2.5 text-[13px] font-bold text-ink"
        >
          {upcoming ? <Ticket size={14} /> : <PlayCircle size={14} />}
          {upcoming ? "购票" : "集锦"}
        </button>
        <button
          type="button"
          onClick={() => app.toast("原型：将跳转至官方授权直播平台")}
          className="flex items-center justify-center gap-1 rounded-xl bg-chili py-2.5 text-[13px] font-bold text-white"
        >
          <Tv size={14} />
          {match.status === "live" ? "看直播" : "直播入口"}
        </button>
      </div>
    </div>
  );
}

function Stepper({
  value,
  onChange,
  color,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  color: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled || value <= 0}
        onClick={() => onChange(value - 1)}
        aria-label="减少"
        className="flex size-8 items-center justify-center rounded-full bg-paper text-ink/60 disabled:opacity-30"
      >
        <Minus size={14} />
      </button>
      <span
        className="w-8 text-center font-display text-[30px] leading-none font-bold"
        style={{ color }}
      >
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= 9}
        onClick={() => onChange(value + 1)}
        aria-label="增加"
        className="flex size-8 items-center justify-center rounded-full bg-paper text-ink/60 disabled:opacity-30"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

export function GuessCard({ match }: { match: Match }) {
  const app = useApp();
  const mine = app.guesses[match.id];
  const [draft, setDraft] = useState<[number, number]>(mine ?? [1, 1]);
  const home = TEAM_MAP[match.home];
  const away = TEAM_MAP[match.away];
  const open = match.status === "upcoming";
  const earned = match.status === "finished" && mine ? guessPoints(match, mine) : null;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-black text-ink">比分竞猜</span>
        <span className="text-[11px] text-ink/40">猜中比分 +30 · 猜中胜负 +10 积分</span>
      </div>
      {open ? (
        <>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex flex-col items-center gap-1">
              <Crest team={home} size={24} />
              <span className="text-[12px] font-bold text-ink/70">{home.city}</span>
            </div>
            <Stepper
              value={draft[0]}
              color={home.color}
              onChange={(v) => setDraft([v, draft[1]])}
            />
            <span className="text-ink/25">:</span>
            <Stepper
              value={draft[1]}
              color={away.color}
              onChange={(v) => setDraft([draft[0], v])}
            />
            <div className="flex flex-col items-center gap-1">
              <Crest team={away} size={24} />
              <span className="text-[12px] font-bold text-ink/70">{away.city}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!app.requireLogin()) return;
              app.setGuess(match.id, draft);
              app.toast(`已提交竞猜 ${draft[0]}:${draft[1]}，开赛前可修改`);
            }}
            className="mt-3 w-full rounded-xl bg-ink py-2.5 text-[14px] font-bold text-white"
          >
            {mine
              ? mine[0] === draft[0] && mine[1] === draft[1]
                ? `已竞猜 ${mine[0]}:${mine[1]}`
                : "修改竞猜"
              : "提交竞猜"}
          </button>
        </>
      ) : (
        <div className="mt-2 text-[13px] text-ink/55">
          {mine ? `你的竞猜 ${mine[0]}:${mine[1]}` : "你没有参与本场竞猜"}
          {match.status === "live" && " · 比赛进行中，竞猜已截止"}
          {earned !== null && (
            <span className={`ml-1 font-bold ${earned ? "text-emerald-600" : "text-ink/40"}`}>
              · {earned ? `+${earned} 积分` : "未猜中"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function Commentary({ match }: { match: Match }) {
  const app = useApp();
  const lines = commentary(match, app.liveMinute);
  return (
    <div className="mt-4">
      {match.status === "live" && (
        <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-chili">
          <span className="size-1.5 animate-pulse rounded-full bg-chili" />
          文字直播实时更新中
        </div>
      )}
      <ol className="space-y-2">
        {lines.map((l, i) => (
          <li
            key={`${l.minute}-${i}`}
            className={`flex gap-3 rounded-xl px-3 py-2.5 text-[13px] leading-relaxed ${
              l.kind === "goal"
                ? "bg-chili text-white"
                : l.kind === "whistle"
                  ? "bg-ink text-white"
                  : "bg-white text-ink/75 shadow-soft"
            }`}
          >
            <span
              className={`w-8 shrink-0 font-display text-[15px] font-bold ${l.kind === "goal" || l.kind === "whistle" ? "text-white/80" : "text-ink/40"}`}
            >
              {l.minute}'
            </span>
            <span className={l.kind === "goal" ? "font-bold" : ""}>{l.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Comments({ match }: { match: Match }) {
  const app = useApp();
  const [text, setText] = useState("");
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const seeded = useMemo(() => seedComments(match), [match]);
  const mine = (app.myComments[match.id] ?? []).map((c) => ({
    id: c.id,
    nick: app.user?.nick ?? "我",
    teamId: app.favTeam ?? match.home,
    text: c.text,
    likes: 0,
    ago: "刚刚",
    mine: true,
  }));
  const all = [...mine.reverse(), ...seeded];

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    if (!app.requireLogin()) return;
    app.addComment(match.id, t);
    setText("");
  };

  return (
    <div className="mt-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2 rounded-full bg-white py-1.5 pr-1.5 pl-4 ring-1 ring-ink/8"
      >
        <input
          value={text}
          maxLength={80}
          onChange={(e) => setText(e.target.value)}
          placeholder="友善发言，为家乡球队加油"
          className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink/35"
        />
        <button
          type="submit"
          aria-label="发送"
          disabled={!text.trim()}
          className="flex size-8 items-center justify-center rounded-full bg-chili text-white disabled:bg-ink/10 disabled:text-ink/30"
        >
          <Send size={14} />
        </button>
      </form>
      <p className="mt-2 px-1 text-[11px] text-ink/35">原型：正式版评论将经过内容审核后公开</p>
      <ul className="mt-3 space-y-3">
        {all.map((c) => {
          const team = TEAM_MAP[c.teamId];
          const isLiked = liked[c.id];
          return (
            <li key={c.id} className="flex gap-3">
              <Crest team={team} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[12px]">
                  <span className="font-bold text-ink/80">{c.nick}</span>
                  <span
                    className="rounded px-1 text-[10px] text-white"
                    style={{ background: team.color }}
                  >
                    {team.city}
                  </span>
                  {c.mine && <span className="text-[10px] text-chili">我</span>}
                  <span className="ml-auto text-ink/30">{c.ago}</span>
                </div>
                <p className="mt-0.5 text-[14px] leading-relaxed text-ink">{c.text}</p>
                <button
                  type="button"
                  onClick={() => setLiked((s) => ({ ...s, [c.id]: !s[c.id] }))}
                  className={`mt-1 flex items-center gap-1 text-[12px] ${isLiked ? "text-chili" : "text-ink/35"}`}
                >
                  <Heart size={12} fill={isLiked ? "currentColor" : "none"} />
                  {c.likes + (isLiked ? 1 : 0)}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MatchReport({ match }: { match: Match }) {
  const r = matchReport(match);
  return (
    <div className="mt-4 rounded-2xl bg-white p-4 shadow-soft">
      <div className="flex items-center gap-1.5 text-[12px] font-bold text-chili">
        <Sparkles size={13} />
        AI 战报
      </div>
      <h3 className="mt-1.5 text-[17px] leading-snug font-black text-ink">{r.title}</h3>
      <div className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink/70">
        {r.paras.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}

export function SeasonCompare({ match }: { match: Match }) {
  const standings = useMemo(() => computeStandings(MATCHES), []);
  const home = TEAM_MAP[match.home];
  const away = TEAM_MAP[match.away];
  const idx = (id: string) => standings.findIndex((r) => r.teamId === id);
  const h = standings[idx(home.id)];
  const a = standings[idx(away.id)];
  const per = (n: number, d: number) => (d ? n / d : 0);
  const rows: [string, number, number, (v: number) => string, boolean][] = [
    ["排名", idx(home.id) + 1, idx(away.id) + 1, (v) => `第${v}`, true],
    ["积分", h.points, a.points, (v) => String(v), false],
    ["胜率", per(h.won, h.played), per(a.won, a.played), (v) => `${Math.round(v * 100)}%`, false],
    ["场均进球", per(h.gf, h.played), per(a.gf, a.played), (v) => v.toFixed(1), false],
    ["场均失球", per(h.ga, h.played), per(a.ga, a.played), (v) => v.toFixed(1), true],
  ];
  return (
    <div className="mt-4 rounded-2xl bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between text-[13px] font-black">
        <span style={{ color: home.color }}>{home.city}</span>
        <span className="text-[12px] font-bold text-ink/40">赛季数据对比</span>
        <span style={{ color: away.color }}>{away.city}</span>
      </div>
      <div className="space-y-3">
        {rows.map(([label, hv, av, fmt, lowerBetter]) => {
          const hBetter = lowerBetter ? hv < av : hv > av;
          const aBetter = lowerBetter ? av < hv : av > hv;
          return (
            <div key={label} className="flex items-center text-[14px]">
              <span
                className={`w-16 font-display text-[17px] font-bold ${hBetter ? "text-ink" : "text-ink/40"}`}
              >
                {fmt(hv)}
              </span>
              <span className="flex-1 text-center text-[12px] text-ink/45">{label}</span>
              <span
                className={`w-16 text-right font-display text-[17px] font-bold ${aBetter ? "text-ink" : "text-ink/40"}`}
              >
                {fmt(av)}
              </span>
            </div>
          );
        })}
        <div className="flex items-center text-[12px]">
          <span className="flex w-16 gap-0.5">
            {h.form.map((f, i) => (
              <FormDot key={i} f={f} />
            ))}
          </span>
          <span className="flex-1 text-center text-ink/45">近期战绩</span>
          <span className="flex w-16 justify-end gap-0.5">
            {a.form.map((f, i) => (
              <FormDot key={i} f={f} />
            ))}
          </span>
        </div>
      </div>
      {match.status === "finished" && (
        <p className="mt-3 text-[11px] text-ink/35">全场比分 {score(match).join(":")}</p>
      )}
    </div>
  );
}

function FormDot({ f }: { f: "W" | "D" | "L" }) {
  return (
    <span
      className={`flex size-4 items-center justify-center rounded text-[9px] font-bold text-white ${f === "W" ? "bg-emerald-500" : f === "D" ? "bg-ink/30" : "bg-chili"}`}
    >
      {f === "W" ? "胜" : f === "D" ? "平" : "负"}
    </span>
  );
}
