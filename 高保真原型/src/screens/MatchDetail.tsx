import { Bell, BellRing, CalendarPlus, ImageDown, MapPin, Repeat2 } from "lucide-react";
import { useState } from "react";
import { AiPrediction } from "../components/AiPrediction";
import {
  Commentary,
  Comments,
  GuessCard,
  MatchInfoCard,
  MatchReport,
  SeasonCompare,
} from "../components/MatchExtras";
import { Crest, LiveBadge, Overlay } from "../components/ui";
import {
  MATCHES,
  PLAYER_MAP,
  startersOf,
  formatDate,
  score,
  visibleEvents,
  type MatchEvent,
} from "../data/league";
import { TEAM_MAP } from "../data/teams";
import { createRng, hashString } from "../data/random";
import { downloadIcs } from "../lib/calendar";
import { predictMatch } from "../data/predict";
import { useApp } from "../state";

type MatchTab = "events" | "live" | "ai" | "stats" | "lineup" | "talk";

export function MatchDetail({
  id,
  onBack,
  initialTab,
}: {
  id: string;
  onBack: () => void;
  initialTab?: "ai";
}) {
  const app = useApp();
  const match = MATCHES.find((m) => m.id === id)!;
  const home = TEAM_MAP[match.home];
  const away = TEAM_MAP[match.away];
  const [hs, as] = score(match, app.liveMinute);
  const events = visibleEvents(match, app.liveMinute);
  const [tab, setTab] = useState<MatchTab>(
    initialTab ?? (match.status === "upcoming" ? "ai" : "events"),
  );
  const reminded = app.reminders.includes(match.id);

  return (
    <Overlay
      onBack={onBack}
      tone="dark"
      share={{
        title: `湘超第${match.round}轮 ${home.city} vs ${away.city}`,
        text:
          match.status === "upcoming"
            ? `湘超第${match.round}轮 ${home.city} vs ${away.city}，${formatDate(match.date)} ${match.time} 开球，AI 预测 ${predictMatch(match).predicted.join(":")}，一起来看！`
            : `湘超第${match.round}轮 ${home.city} ${hs}:${as} ${away.city}${match.status === "live" ? `（${app.liveMinute}' 进行中）` : "（完场）"}`,
      }}
    >
      <div className="relative overflow-hidden bg-ink px-5 pt-14 pb-7 text-white">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background: `radial-gradient(circle at 0% 40%, ${home.color}, transparent 55%), radial-gradient(circle at 100% 40%, ${away.color}, transparent 55%)`,
          }}
        />
        <div className="relative">
          <div className="text-center text-[12px] text-white/60">
            第{match.round}轮 · {formatDate(match.date)} {match.time}
          </div>
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <button
              type="button"
              onClick={() => app.open({ type: "team", id: home.id })}
              className="flex flex-col items-center gap-2"
            >
              <Crest team={home} size={60} />
              <span className="text-[16px] font-bold">{home.city}</span>
              <span className="text-[11px] text-white/50">主场</span>
            </button>
            <div className="flex flex-col items-center gap-2">
              {match.status === "upcoming" ? (
                <span className="font-display text-[44px] leading-none font-bold text-white/85 italic">
                  VS
                </span>
              ) : (
                <span className="font-display text-[68px] leading-none font-bold tracking-tight italic tabular-nums">
                  {hs}
                  <span className="mx-1.5 align-[0.1em] text-[48px] text-white/30 not-italic">
                    :
                  </span>
                  {as}
                </span>
              )}
              {match.status === "live" ? (
                <LiveBadge minute={app.liveMinute} />
              ) : (
                <span className="text-[12px] text-white/50">
                  {match.status === "finished" ? "完场" : "未开赛"}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => app.open({ type: "team", id: away.id })}
              className="flex flex-col items-center gap-2"
            >
              <Crest team={away} size={60} />
              <span className="text-[16px] font-bold">{away.city}</span>
              <span className="text-[11px] text-white/50">客场</span>
            </button>
          </div>
          <div className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-white/55">
            <MapPin size={13} />
            {home.stadium}
            {match.status !== "upcoming" && ` · 观众 ${match.attendance.toLocaleString()}`}
          </div>
          {match.status === "upcoming" && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => app.toggleRemind(match.id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold ${reminded ? "bg-white text-ink" : "bg-chili text-white"}`}
              >
                {reminded ? <BellRing size={15} /> : <Bell size={15} />}
                {reminded ? "已加入提醒" : "加入提醒"}
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadIcs([match], `湘超-${home.city}vs${away.city}.ics`);
                  app.toast("已生成日历文件，打开即可添加到手机日历");
                }}
                className="flex items-center gap-1.5 rounded-full bg-white/12 px-4 py-2 text-[13px] font-bold text-white"
              >
                <CalendarPlus size={15} />
                加入日历
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => app.open({ type: "poster", id: match.id })}
            className="mx-auto mt-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold text-white/75 ring-1 ring-white/20"
          >
            <ImageDown size={14} />
            生成分享海报
          </button>
        </div>
      </div>

      <div className="space-y-3 px-5 pt-5 pb-10">
        <MatchInfoCard match={match} />
        <GuessCard match={match} />
        <Prediction
          matchId={match.id}
          homeCity={home.city}
          awayCity={away.city}
          homeColor={home.color}
          awayColor={away.color}
        />

        <div className="no-scrollbar -mx-5 mt-5 flex gap-5 overflow-x-auto border-b border-ink/8 px-5">
          {(
            [
              ["events", "赛况"],
              ["live", "文字直播"],
              ["ai", "AI预测"],
              ["stats", "数据"],
              ["lineup", "名单"],
              ["talk", "讨论"],
            ] as [MatchTab, string][]
          )
            .filter(([k]) => match.status !== "upcoming" || !["events", "live"].includes(k))
            .map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`-mb-px shrink-0 border-b-2 pb-2.5 text-[15px] font-bold transition ${tab === key ? "border-chili text-ink" : "border-transparent text-ink/40"}`}
              >
                {label}
              </button>
            ))}
        </div>

        {tab === "events" && (
          <>
            {match.status === "finished" && <MatchReport match={match} />}
            <Timeline events={events} live={match.status === "live"} />
          </>
        )}
        {tab === "live" && <Commentary match={match} />}
        {tab === "talk" && <Comments match={match} />}
        {tab === "ai" && <AiPrediction match={match} />}
        {tab === "stats" && (
          <>
            {match.status !== "upcoming" && (
              <Stats matchId={match.id} homeColor={home.color} awayColor={away.color} />
            )}
            <SeasonCompare match={match} />
          </>
        )}
        {tab === "lineup" && <Lineups homeId={home.id} awayId={away.id} />}
      </div>
    </Overlay>
  );
}

function Prediction({
  matchId,
  homeCity,
  awayCity,
  homeColor,
  awayColor,
}: {
  matchId: string;
  homeCity: string;
  awayCity: string;
  homeColor: string;
  awayColor: string;
}) {
  const app = useApp();
  const mine = app.votes[matchId];
  const rng = createRng(hashString("vote-" + matchId));
  const base = { home: rng.int(800, 3000), draw: rng.int(300, 1200), away: rng.int(800, 3000) };
  if (mine) base[mine]++;
  const total = base.home + base.draw + base.away;
  const pct = (n: number) => Math.round((n / total) * 100);
  const options = [
    ["home", `${homeCity}胜`, homeColor],
    ["draw", "平局", "#8a817a"],
    ["away", `${awayCity}胜`, awayColor],
  ] as const;
  return (
    <div className="rounded-2xl bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-black text-ink">球迷支持率</span>
        <span className="text-[11px] text-ink/40">
          {mine ? `${total.toLocaleString()} 人参与` : "投票后查看结果"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {options.map(([key, label, color]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              app.vote(matchId, key);
              app.toast(`已支持：${label}`);
            }}
            className={`relative overflow-hidden rounded-xl py-2.5 text-[13px] font-bold transition ${mine === key ? "text-white" : "bg-paper text-ink/70"}`}
            style={mine === key ? { background: color } : undefined}
          >
            {label}
            {mine && (
              <div className="mt-0.5 font-display text-[18px] leading-none">{pct(base[key])}%</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function eventLabel(e: MatchEvent) {
  if (e.type === "goal") return e.note === "点球" ? "点球破门" : "进球";
  if (e.type === "yellow") return "黄牌";
  if (e.type === "red") return "红牌";
  return "替补登场";
}

function EventIcon({ e }: { e: MatchEvent }) {
  if (e.type === "goal")
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-ink text-white">
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7l4 3-1.5 4.5h-5L8 10z" fill="currentColor" />
        </svg>
      </span>
    );
  if (e.type === "sub")
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <Repeat2 size={14} />
      </span>
    );
  return (
    <span className="flex size-7 items-center justify-center">
      <span
        className={`h-4 w-3 rounded-[2px] ${e.type === "yellow" ? "bg-amber-400" : "bg-chili"}`}
      />
    </span>
  );
}

function Timeline({ events, live }: { events: MatchEvent[]; live: boolean }) {
  if (events.length === 0)
    return <p className="py-10 text-center text-[13px] text-ink/40">比赛暂无关键事件</p>;
  const ordered = [...events].reverse();
  return (
    <div className="relative mt-4">
      <div className="absolute top-2 bottom-2 left-1/2 w-px -translate-x-1/2 bg-ink/10" />
      {live && (
        <div className="mb-3 text-center text-[12px] font-semibold text-chili">实时更新中</div>
      )}
      <div className="space-y-3">
        {ordered.map((e, i) => {
          const p = PLAYER_MAP[e.playerId];
          const card = (
            <div className={`flex-1 ${e.side === "home" ? "text-right" : "text-left"}`}>
              <div
                className={`text-[14px] ${e.type === "goal" ? "font-black text-ink" : "font-semibold text-ink/75"}`}
              >
                {p.name}
              </div>
              <div className="text-[11px] text-ink/40">{eventLabel(e)}</div>
            </div>
          );
          return (
            <div key={i} className="relative flex items-center gap-3">
              {e.side === "home" ? card : <div className="flex-1" />}
              <div className="relative z-10 flex flex-col items-center bg-paper py-0.5">
                <EventIcon e={e} />
                <span className="font-display text-[12px] font-semibold text-ink/50">
                  {e.minute}'
                </span>
              </div>
              {e.side === "away" ? card : <div className="flex-1" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stats({
  matchId,
  homeColor,
  awayColor,
}: {
  matchId: string;
  homeColor: string;
  awayColor: string;
}) {
  const s = MATCHES.find((m) => m.id === matchId)!.stats;
  const rows: [string, [number, number], string?][] = [
    ["控球率", s.possession, "%"],
    ["射门", s.shots],
    ["射正", s.onTarget],
    ["角球", s.corners],
    ["犯规", s.fouls],
  ];
  return (
    <div className="mt-5 space-y-4">
      {rows.map(([label, [h, a], unit]) => {
        const total = h + a || 1;
        return (
          <div key={label}>
            <div className="flex justify-between text-[13px]">
              <span className="font-display text-[16px] font-bold text-ink">
                {h}
                {unit}
              </span>
              <span className="text-ink/50">{label}</span>
              <span className="font-display text-[16px] font-bold text-ink">
                {a}
                {unit}
              </span>
            </div>
            <div className="mt-1.5 flex h-1.5 gap-1">
              <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-ink/6">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(h / total) * 100}%`, background: homeColor }}
                />
              </div>
              <div className="flex-1 overflow-hidden rounded-full bg-ink/6">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(a / total) * 100}%`, background: awayColor }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Lineups({ homeId, awayId }: { homeId: string; awayId: string }) {
  const app = useApp();
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {[homeId, awayId].map((id) => (
        <div key={id} className="rounded-2xl bg-white p-3 shadow-soft">
          <div className="mb-2 flex items-center gap-2">
            <Crest team={TEAM_MAP[id]} size={20} />
            <span className="text-[13px] font-black text-ink">{TEAM_MAP[id].city} 首发</span>
          </div>
          <ul className="space-y-1.5">
            {startersOf(id).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => app.open({ type: "player", id: p.id })}
                  className="flex w-full items-center gap-2 text-left text-[13px]"
                >
                  <span className="w-5 text-right font-display font-bold text-ink/40">
                    {p.number}
                  </span>
                  <span className="flex-1 truncate font-medium text-ink">{p.name}</span>
                  <span className="text-[10px] text-ink/35">{p.position}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
