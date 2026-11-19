import { Img } from "../components/Img";
import { Bell, ChevronRight, MapPin, Search, Trophy, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AiPicks } from "../components/AiPicks";
import { Crest, LiveBadge, MatchCard, SectionTitle, Sheet } from "../components/ui";
import { CURRENT_ROUND, MATCHES, TOTAL_ROUNDS, formatDate, score } from "../data/league";
import { HERO_IMAGE } from "../data/news";
import { TEAM_MAP } from "../data/teams";
import { useApp } from "../state";
import { unreadCount } from "./NotificationsScreen";

export function HomeScreen({ onOpenMe, onSearch }: { onOpenMe: () => void; onSearch: () => void }) {
  const app = useApp();
  const [round, setRound] = useState(CURRENT_ROUND);
  const chipsRef = useRef<HTMLDivElement>(null);
  const live = MATCHES.find((m) => m.status === "live")!;
  const favNext = app.favTeam
    ? MATCHES.find(
        (m) => m.status !== "finished" && (m.home === app.favTeam || m.away === app.favTeam),
      )
    : null;

  const grouped = useMemo(() => {
    const map = new Map<string, typeof MATCHES>();
    for (const m of MATCHES.filter((x) => x.round === round)) {
      if (!map.has(m.date)) map.set(m.date, []);
      map.get(m.date)!.push(m);
    }
    return [...map.entries()];
  }, [round]);

  useEffect(() => {
    const el = chipsRef.current?.querySelector<HTMLElement>(`[data-round="${round}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [round]);

  const unread = unreadCount(app.favTeam, app.readNotifs);
  const iconBtn =
    "relative flex size-10 items-center justify-center rounded-full bg-white/8 text-white/80 ring-1 ring-white/10 backdrop-blur transition hover:bg-white/15";

  return (
    <div>
      <header className="texture-stripes relative overflow-hidden bg-ink px-5 pt-5 pb-16 text-white">
        <Img
          src={HERO_IMAGE}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover opacity-25 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/70 to-ink" />
        <div
          className="pointer-events-none absolute top-24 -left-24 size-72 rounded-full blur-3xl"
          style={{ background: TEAM_MAP[live.home].color, opacity: 0.45 }}
        />
        <div
          className="pointer-events-none absolute top-24 -right-24 size-72 rounded-full blur-3xl"
          style={{ background: TEAM_MAP[live.away].color, opacity: 0.45 }}
        />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative flex size-10 items-center justify-center rounded-[12px] bg-chili text-[20px] font-black shadow-[0_8px_20px_-6px_rgba(215,38,30,0.9)]">
              湘
              <span className="absolute inset-[3px] rounded-[9px] ring-1 ring-gold/50" />
            </div>
            <div>
              <div className="text-[22px] leading-none font-black tracking-tight">湘超</div>
              <div className="kicker mt-1 text-[9px] text-white/45">Hunan League · 2025</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onSearch} aria-label="搜索" className={iconBtn}>
              <Search size={18} />
            </button>
            <button
              type="button"
              onClick={() => app.open({ type: "notifications", id: "inbox" })}
              aria-label="消息"
              className={iconBtn}
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-chili text-[10px] font-bold ring-2 ring-ink">
                  {unread}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onOpenMe}
              aria-label="我的"
              className={`${iconBtn} overflow-hidden`}
            >
              {app.favTeam ? (
                <Crest team={TEAM_MAP[app.favTeam]} size={24} />
              ) : (
                <UserRound size={18} />
              )}
            </button>
          </div>
        </div>

        <LiveHero matchId={live.id} />
      </header>

      <Sheet flush className="pb-2">
        {favNext && (
          <section className="px-5">
            <SectionTitle>我的主队</SectionTitle>
            <button
              type="button"
              onClick={() => app.open({ type: "match", id: favNext.id })}
              className="relative flex w-full items-center gap-3 overflow-hidden rounded-[20px] bg-white p-4 text-left shadow-soft"
            >
              <span
                className="absolute inset-y-0 left-0 w-1.5"
                style={{ background: TEAM_MAP[app.favTeam!].color }}
              />
              <Crest team={TEAM_MAP[app.favTeam!]} size={42} />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] text-ink/45">
                  {favNext.status === "live"
                    ? "正在比赛"
                    : `下一场 · 第${favNext.round}轮 · ${formatDate(favNext.date)} ${favNext.time}`}
                </div>
                <div className="mt-0.5 truncate text-[17px] font-black text-ink">
                  {TEAM_MAP[favNext.home].city}{" "}
                  <span className="font-display text-ink/30 italic">vs</span>{" "}
                  {TEAM_MAP[favNext.away].city}
                </div>
              </div>
              <ChevronRight size={18} className="text-ink/25" />
            </button>
          </section>
        )}

        <AiPicks />

        <div className="px-5 pt-7">
          <button
            type="button"
            onClick={() => app.open({ type: "bracket", id: "ko" })}
            className="relative flex w-full items-center gap-3 overflow-hidden rounded-[20px] bg-gradient-to-r from-[#f7e3b5] via-[#f8ecd2] to-[#fbf5e8] p-4 text-left shadow-soft"
          >
            <Trophy size={64} className="absolute -right-2 -bottom-3 text-gold/25" />
            <span className="flex size-11 items-center justify-center rounded-2xl bg-ink text-gold">
              <Trophy size={20} />
            </span>
            <div className="relative flex-1">
              <div className="kicker text-[#a06d12]">Knockout</div>
              <div className="mt-1 text-[16px] font-black text-ink">淘汰赛对阵 · 冠军推演</div>
            </div>
            <ChevronRight size={18} className="relative text-ink/30" />
          </button>
        </div>

        <section className="pt-7">
          <div className="px-5">
            <SectionTitle
              action={<span className="text-[12px] text-ink/40">共 {TOTAL_ROUNDS} 轮</span>}
            >
              赛程赛果
            </SectionTitle>
          </div>
          <div ref={chipsRef} className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-1">
            {Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1).map((r) => (
              <button
                key={r}
                data-round={r}
                type="button"
                onClick={() => setRound(r)}
                className={`relative shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition ${
                  r === round
                    ? "bg-ink text-white shadow-[0_8px_18px_-8px_rgba(20,16,17,0.7)]"
                    : "bg-white text-ink/55 shadow-soft"
                }`}
              >
                第{r}轮
                {r === CURRENT_ROUND && (
                  <span className="absolute top-0 right-0 size-2 rounded-full bg-chili ring-2 ring-paper" />
                )}
              </button>
            ))}
          </div>
          <div className="space-y-5 px-5 pt-4">
            {grouped.map(([date, list]) => (
              <div key={date}>
                <div className="mb-2 flex items-center gap-2 text-[12px] font-bold text-ink/50">
                  {formatDate(date)}
                  <span className="h-px flex-1 bg-ink/8" />
                  <span className="font-normal text-ink/35">{list.length} 场</span>
                </div>
                <div className="divide-y divide-ink/[0.06] overflow-hidden rounded-[20px] bg-white shadow-soft">
                  {list.map((m) => (
                    <MatchCard
                      key={m.id}
                      bare
                      match={m}
                      liveMinute={app.liveMinute}
                      reminded={app.reminders.includes(m.id)}
                      onToggleRemind={() => app.toggleRemind(m.id)}
                      onOpen={() => app.open({ type: "match", id: m.id })}
                      highlightTeam={app.favTeam}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </Sheet>
    </div>
  );
}

function LiveHero({ matchId }: { matchId: string }) {
  const app = useApp();
  const match = MATCHES.find((m) => m.id === matchId)!;
  const home = TEAM_MAP[match.home];
  const away = TEAM_MAP[match.away];
  const [hs, as] = score(match, app.liveMinute);
  return (
    <button
      type="button"
      onClick={() => app.open({ type: "match", id: match.id })}
      className="relative mt-7 block w-full text-left"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="kicker text-gold">Live</span>
          <span className="text-[12px] font-bold text-white/70">第{match.round}轮焦点战</span>
        </span>
        <LiveBadge minute={app.liveMinute} />
      </div>
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex flex-col items-center gap-2.5">
          <Crest team={home} size={64} />
          <span className="text-[17px] font-black">{home.city}</span>
        </div>
        <div className="font-display text-[80px] leading-none font-bold tracking-tight italic tabular-nums">
          {hs}
          <span className="mx-1.5 align-[0.12em] text-[56px] text-white/30 not-italic">:</span>
          {as}
        </div>
        <div className="flex flex-col items-center gap-2.5">
          <Crest team={away} size={64} />
          <span className="text-[17px] font-black">{away.city}</span>
        </div>
      </div>
      <div className="mx-auto mt-5 h-1 max-w-[220px] overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-chili to-gold transition-all duration-700"
          style={{ width: `${(Math.min(app.liveMinute, 90) / 90) * 100}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-white/55">
        <MapPin size={13} />
        {home.stadium} · 现场 {match.attendance.toLocaleString()} 人
      </div>
    </button>
  );
}
