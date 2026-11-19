import { Bell, BellRing, ChevronLeft, Share2 } from "lucide-react";
import type { ReactNode } from "react";
import { score, type Match } from "../data/league";
import { TEAM_MAP, type Team } from "../data/teams";
import { useApp } from "../state";

const MARK_OVERRIDES: Record<string, string> = { xt: "潭", xx: "西" };

export function Crest({ team, size = 36 }: { team: Team; size?: number }) {
  const mark = MARK_OVERRIDES[team.id] ?? team.city[0];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 44"
      aria-hidden
      className="shrink-0 drop-shadow-sm"
    >
      <path d="M20 1 L38 6 V22 C38 33 30 40 20 43 C10 40 2 33 2 22 V6 Z" fill={team.color} />
      <path d="M20 1 L38 6 V22 C38 33 30 40 20 43 Z" fill="#000" opacity="0.12" />
      <path d="M2 30 L38 16 V20 L3.6 33.5 Z" fill={team.accent} opacity="0.9" />
      <path
        d="M20 1 L38 6 V22 C38 33 30 40 20 43 C10 40 2 33 2 22 V6 Z"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <text
        x="20"
        y="25"
        textAnchor="middle"
        fontSize="17"
        fontWeight="900"
        fill="#fff"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        {mark}
      </text>
    </svg>
  );
}

export function LiveBadge({ minute }: { minute: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-chili px-2 py-0.5 text-[11px] font-bold text-white">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-white" />
      </span>
      {minute >= 90 ? "90+'" : `${minute}'`}
    </span>
  );
}

export function MatchCard({
  match,
  liveMinute,
  reminded,
  onToggleRemind,
  onOpen,
  highlightTeam,
  bare = false,
}: {
  match: Match;
  liveMinute: number;
  reminded: boolean;
  onToggleRemind: () => void;
  onOpen: () => void;
  highlightTeam?: string | null;
  /** Row style for use inside a grouped list container. */
  bare?: boolean;
}) {
  const home = TEAM_MAP[match.home];
  const away = TEAM_MAP[match.away];
  const [hs, as] = score(match, liveMinute);
  const isFav = highlightTeam && (match.home === highlightTeam || match.away === highlightTeam);
  const live = match.status === "live";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className={`group relative flex items-center gap-3 px-4 py-3.5 text-left transition active:bg-paper/70 ${
        bare ? "" : "rounded-[20px] bg-white shadow-soft"
      } ${isFav ? "bg-chili/[0.04]" : ""}`}
    >
      {(live || isFav) && (
        <span
          className={`absolute inset-y-3 left-0 w-[3px] rounded-r-full ${live ? "bg-chili" : "bg-chili/50"}`}
        />
      )}
      <div className="flex w-12 shrink-0 flex-col items-start gap-1">
        {live ? (
          <LiveBadge minute={liveMinute} />
        ) : (
          <span className="font-display text-[17px] leading-none font-semibold text-ink/80">
            {match.time}
          </span>
        )}
        <span className={`text-[11px] ${live ? "font-bold text-chili" : "text-ink/40"}`}>
          {match.status === "finished" ? "完场" : live ? "进行中" : "未开赛"}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <TeamLine
          team={home}
          goals={match.status === "upcoming" ? null : hs}
          winner={match.status === "finished" && hs > as}
          dim={match.status === "finished" && hs < as}
        />
        <TeamLine
          team={away}
          goals={match.status === "upcoming" ? null : as}
          winner={match.status === "finished" && as > hs}
          dim={match.status === "finished" && as < hs}
        />
      </div>
      {match.status === "upcoming" && (
        <button
          type="button"
          aria-label={reminded ? "取消提醒" : "开赛提醒"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleRemind();
          }}
          className={`flex size-9 shrink-0 items-center justify-center rounded-full transition ${
            reminded
              ? "bg-chili text-white shadow-[0_6px_14px_-6px_rgba(215,38,30,0.8)]"
              : "bg-paper text-ink/45 hover:text-ink"
          }`}
        >
          {reminded ? <BellRing size={16} /> : <Bell size={16} />}
        </button>
      )}
    </div>
  );
}

function TeamLine({
  team,
  goals,
  winner,
  dim,
}: {
  team: Team;
  goals: number | null;
  winner: boolean;
  dim: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Crest team={team} size={22} />
      <span
        className={`flex-1 truncate text-[15px] ${winner ? "font-black text-ink" : dim ? "font-medium text-ink/45" : "font-bold text-ink/85"}`}
      >
        {team.city}
      </span>
      {goals !== null && (
        <span
          className={`font-display text-[22px] leading-none font-bold italic ${winner ? "text-ink" : dim ? "text-ink/35" : "text-ink/70"}`}
        >
          {goals}
        </span>
      )}
    </div>
  );
}

const KICKERS: Record<string, string> = {
  我的主队: "My Club",
  赛程赛果: "Fixtures",
  城市名片: "City Guide",
  个人资料: "Profile",
  进球记录: "Goals",
  同位置队友: "Teammates",
  选择主队: "Pick Your Club",
  开赛提醒: "Reminders",
  本轮竞猜: "Predict",
  推送设置: "Notifications",
};

export function SectionTitle({
  children,
  action,
  kicker,
}: {
  children: ReactNode;
  action?: ReactNode;
  kicker?: string;
}) {
  const k = kicker ?? (typeof children === "string" ? KICKERS[children] : undefined);
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        {k && <div className="kicker mb-1.5 text-chili">{k}</div>}
        <h2 className="flex items-center gap-1.5 text-[19px] leading-tight font-black tracking-tight text-ink">
          {children}
        </h2>
      </div>
      {action && <div className="pb-0.5">{action}</div>}
    </div>
  );
}

/** Dark brand band used at the top of each tab. */
export function PageHeader({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className="texture-stripes relative overflow-hidden bg-ink px-5 pt-7 pb-14 text-white">
      <div className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-chili/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-10 size-56 rounded-full bg-gold/15 blur-3xl" />
      <div className="relative">
        <div className="kicker text-gold">{kicker}</div>
        <h1 className="mt-2 text-[32px] leading-none font-black tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-[13px] text-white/55">{subtitle}</p>}
        {children && <div className="mt-5">{children}</div>}
      </div>
    </header>
  );
}

/** Rounded content panel that overlaps the dark header above it. */
export function Sheet({
  children,
  className = "",
  flush = false,
}: {
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <div
      className={`relative -mt-7 rounded-t-[28px] bg-paper pt-6 ${flush ? "" : "px-5"} ${className}`}
    >
      {children}
    </div>
  );
}

/** Segmented control styled for dark headers. */
export function DarkSegments<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="flex rounded-full bg-white/8 p-1 ring-1 ring-white/10">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex-1 rounded-full py-2 text-[13px] font-bold transition ${value === key ? "bg-white text-ink shadow" : "text-white/60 hover:text-white"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function Overlay({
  children,
  onBack,
  title,
  tone = "light",
  header,
  share,
}: {
  children: ReactNode;
  onBack: () => void;
  title?: string;
  tone?: "light" | "dark";
  header?: ReactNode;
  share?: { title: string; text: string };
}) {
  const app = useApp();
  const btn = `flex size-9 shrink-0 items-center justify-center rounded-full ${tone === "dark" ? "bg-black/25 backdrop-blur" : "hover:bg-ink/5"}`;
  return (
    <div className="animate-slide-in fixed inset-y-0 left-1/2 z-40 w-full max-w-[440px] -translate-x-1/2 overflow-y-auto bg-paper">
      <div
        className={`sticky top-0 z-10 flex h-12 items-center gap-2 px-2 ${tone === "dark" ? "text-white" : "bg-paper/90 text-ink backdrop-blur"}`}
      >
        <button type="button" onClick={onBack} aria-label="返回" className={btn}>
          <ChevronLeft size={22} />
        </button>
        {header ?? (title && <span className="flex-1 text-[15px] font-bold">{title}</span>)}
        {share && (
          <button
            type="button"
            onClick={() => app.share(share.title, share.text)}
            aria-label="分享"
            className={`${btn} ml-auto`}
          >
            <Share2 size={18} />
          </button>
        )}
      </div>
      <div className="-mt-12">{children}</div>
    </div>
  );
}
