import {
  Bell,
  BellRing,
  CalendarPlus,
  Check,
  ChevronRight,
  FileText,
  Info,
  LogOut,
  MessageSquare,
  Trophy,
} from "lucide-react";
import { Crest, SectionTitle, PageHeader, Sheet } from "../components/ui";
import { MATCHES, formatDate } from "../data/league";
import { SEED_GUESS_HISTORY, guessPoints } from "../data/fans";
import { useMyPoints } from "./FansScreen";
import { unreadCount } from "./NotificationsScreen";
import type { Settings } from "../state";
import { TEAMS, TEAM_MAP } from "../data/teams";
import { downloadIcs } from "../lib/calendar";
import { useApp } from "../state";

export function MeScreen() {
  const app = useApp();
  const fav = app.favTeam ? TEAM_MAP[app.favTeam] : null;
  const reminded = MATCHES.filter((m) => app.reminders.includes(m.id) && m.status === "upcoming");
  const favUpcoming = fav
    ? MATCHES.filter((m) => m.status === "upcoming" && (m.home === fav.id || m.away === fav.id))
    : [];
  const points = useMyPoints();
  const unread = unreadCount(app.favTeam, app.readNotifs);
  const pending = MATCHES.filter((m) => app.guesses[m.id]);
  const hits = SEED_GUESS_HISTORY.filter((h) => guessPoints(h.match, h.guess) > 0).length;
  const toggles: [keyof Settings, string, string][] = [
    ["goal", "进球推送", "关注比赛有进球时通知我"],
    ["kickoff", "开赛提醒", "已加入提醒的比赛开赛前 30 分钟"],
    ["fav", "主队动态", "主队赛果、阵容与新闻"],
    ["news", "资讯推荐", "每日精选湘超资讯"],
  ];
  return (
    <div>
      <PageHeader kicker="My Xiangchao" title="我的" subtitle="主队、竞猜、提醒与设置" />
      <Sheet>
        {app.user ? (
          <div className="flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-soft">
            <span className="flex size-12 items-center justify-center rounded-full bg-chili text-[18px] font-black text-white">
              {app.user.nick[0]}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[17px] font-black text-ink">{app.user.nick}</div>
              <div className="text-[12px] text-ink/45">
                {app.user.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-[24px] leading-none font-bold text-chili">
                {points}
              </div>
              <div className="text-[11px] text-ink/40">竞猜积分</div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => app.open({ type: "login", id: "me" })}
            className="flex w-full items-center gap-3 rounded-[20px] bg-white p-4 text-left shadow-soft"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-ink/8 text-ink/40">
              <MessageSquare size={20} />
            </span>
            <div className="flex-1">
              <div className="text-[17px] font-black text-ink">登录 / 注册</div>
              <div className="text-[12px] text-ink/45">参与竞猜、助威与评论</div>
            </div>
            <ChevronRight size={18} className="text-ink/30" />
          </button>
        )}

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => app.open({ type: "notifications", id: "inbox" })}
            className="relative rounded-2xl bg-white py-3 text-center shadow-soft"
          >
            <Bell size={18} className="mx-auto text-ink/60" />
            <div className="mt-1 text-[12px] font-bold text-ink">消息中心</div>
            {unread > 0 && (
              <span className="absolute top-2 right-3 flex size-4 items-center justify-center rounded-full bg-chili text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>
          <div className="rounded-2xl bg-white py-3 text-center shadow-soft">
            <div className="font-display text-[20px] leading-none font-bold text-ink">
              {app.user ? pending.length : 0}
            </div>
            <div className="mt-1.5 text-[12px] font-bold text-ink">待开奖竞猜</div>
          </div>
          <div className="rounded-2xl bg-white py-3 text-center shadow-soft">
            <div className="font-display text-[20px] leading-none font-bold text-ink">
              {app.user ? `${hits}/${SEED_GUESS_HISTORY.length}` : "—"}
            </div>
            <div className="mt-1.5 text-[12px] font-bold text-ink">竞猜命中</div>
          </div>
        </div>

        <div
          className="mt-4 overflow-hidden rounded-[22px] p-5 text-white"
          style={{
            background: fav
              ? `linear-gradient(140deg, ${fav.color}, color-mix(in srgb, ${fav.color} 55%, #000))`
              : "#17120f",
          }}
        >
          <div className="text-[12px] text-white/60">我的主队</div>
          {fav ? (
            <div className="mt-3 flex items-center gap-3">
              <Crest team={fav} size={52} />
              <div>
                <div className="text-[22px] font-black">{fav.city}队</div>
                <div className="text-[13px] text-white/70">“{fav.slogan}”</div>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-[15px] leading-relaxed text-white/80">
              还没有选择主队。选一支城市球队，首页会置顶它的下一场比赛。
            </div>
          )}
        </div>

        {app.user && (
          <section className="mt-6">
            <SectionTitle>
              <span className="flex items-center gap-1.5">
                我的竞猜 <Trophy size={15} className="text-amber-500" />
              </span>
            </SectionTitle>
            <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
              {pending.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => app.open({ type: "match", id: m.id })}
                  className="flex w-full items-center gap-3 border-b border-ink/5 px-4 py-3 text-left"
                >
                  <span className="flex-1 text-[14px] font-bold text-ink">
                    {TEAM_MAP[m.home].city} vs {TEAM_MAP[m.away].city}
                  </span>
                  <span className="text-[13px] text-ink/60">猜 {app.guesses[m.id].join(":")}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                    待开奖
                  </span>
                </button>
              ))}
              {SEED_GUESS_HISTORY.map(({ match: m, guess }) => {
                const pts = guessPoints(m, guess);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => app.open({ type: "match", id: m.id })}
                    className="flex w-full items-center gap-3 border-b border-ink/5 px-4 py-3 text-left last:border-0"
                  >
                    <span className="flex-1 text-[14px] font-bold text-ink">
                      {TEAM_MAP[m.home].city} vs {TEAM_MAP[m.away].city}
                    </span>
                    <span className="text-[13px] text-ink/60">猜 {guess.join(":")}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${pts ? "bg-emerald-100 text-emerald-700" : "bg-ink/6 text-ink/40"}`}
                    >
                      {pts ? `+${pts}` : "未中"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-6">
          <SectionTitle>选择主队</SectionTitle>
          <div className="grid grid-cols-4 gap-2">
            {TEAMS.map((t) => {
              const active = app.favTeam === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    app.setFavTeam(active ? null : t.id);
                    app.toast(active ? "已取消主队" : `已将${t.city}设为主队`);
                  }}
                  className={`relative flex flex-col items-center gap-1.5 rounded-2xl py-3 transition ${active ? "bg-ink text-white" : "bg-white text-ink shadow-soft"}`}
                >
                  <Crest team={t} size={30} />
                  <span className="text-[12px] font-bold">{t.city}</span>
                  {active && (
                    <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-chili">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <SectionTitle
            action={
              reminded.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    downloadIcs(reminded, "湘超-我的提醒.ics", "湘超 · 我的提醒");
                    app.toast(`已导出 ${reminded.length} 场比赛，打开文件即可加入日历`);
                  }}
                  className="flex items-center gap-1 text-[12px] font-bold text-chili"
                >
                  <CalendarPlus size={14} />
                  导出到日历
                </button>
              )
            }
          >
            开赛提醒
          </SectionTitle>
          {reminded.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl bg-white p-4 text-[13px] text-ink/50 shadow-soft">
              <BellRing size={18} className="text-ink/30" />
              在赛程中点击铃铛，即可预约比赛提醒
            </div>
          ) : (
            <div className="space-y-2">
              {reminded.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => app.open({ type: "match", id: m.id })}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-soft"
                >
                  <Crest team={TEAM_MAP[m.home]} size={24} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold text-ink">
                      {TEAM_MAP[m.home].city} vs {TEAM_MAP[m.away].city}
                    </div>
                    <div className="text-[12px] text-ink/45">
                      第{m.round}轮 · {formatDate(m.date)} {m.time}
                    </div>
                  </div>
                  <Crest team={TEAM_MAP[m.away]} size={24} />
                </button>
              ))}
            </div>
          )}
        </section>

        {fav && favUpcoming.length > 0 && (
          <button
            type="button"
            onClick={() => {
              downloadIcs(favUpcoming, `湘超-${fav.city}队赛程.ics`, `湘超 · ${fav.city}队`);
              app.toast(`已导出${fav.city}队剩余 ${favUpcoming.length} 场比赛`);
            }}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-soft"
          >
            <span
              className="flex size-9 items-center justify-center rounded-full"
              style={{ background: fav.color, color: "#fff" }}
            >
              <CalendarPlus size={17} />
            </span>
            <div className="flex-1">
              <div className="text-[14px] font-bold text-ink">把{fav.city}队赛程加入手机日历</div>
              <div className="text-[12px] text-ink/45">
                剩余 {favUpcoming.length} 场，每场开赛前 30 分钟提醒
              </div>
            </div>
          </button>
        )}

        <section className="mt-6">
          <SectionTitle>推送设置</SectionTitle>
          <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
            {toggles.map(([key, label, desc]) => {
              const on = app.settings[key];
              return (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-3 border-b border-ink/5 px-4 py-3 last:border-0"
                >
                  <div className="flex-1">
                    <div className="text-[14px] font-bold text-ink">{label}</div>
                    <div className="text-[12px] text-ink/45">{desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={on}
                    onChange={() => app.setSettings({ ...app.settings, [key]: !on })}
                    className="peer sr-only"
                  />
                  <span
                    className={`relative h-6 w-10 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-chili/50 ${on ? "bg-chili" : "bg-ink/15"}`}
                  >
                    <span
                      className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`}
                    />
                  </span>
                </label>
              );
            })}
          </div>
          <p className="mt-2 px-1 text-[11px] text-ink/35">
            原型：开关仅保存偏好，正式版接入系统推送后生效
          </p>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-soft">
          <button
            type="button"
            onClick={() => app.open({ type: "privacy", id: "policy" })}
            className="flex w-full items-center gap-3 border-b border-ink/5 px-4 py-3.5 text-left"
          >
            <FileText size={17} className="text-ink/50" />
            <span className="flex-1 text-[14px] font-bold text-ink">隐私政策</span>
            <ChevronRight size={16} className="text-ink/30" />
          </button>
          <button
            type="button"
            onClick={() => app.toast("原型：意见反馈将接入客服系统")}
            className="flex w-full items-center gap-3 border-b border-ink/5 px-4 py-3.5 text-left"
          >
            <MessageSquare size={17} className="text-ink/50" />
            <span className="flex-1 text-[14px] font-bold text-ink">意见反馈</span>
            <ChevronRight size={16} className="text-ink/30" />
          </button>
          {app.user && (
            <button
              type="button"
              onClick={() => {
                app.logout();
                app.toast("已退出登录");
              }}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <LogOut size={17} className="text-chili" />
              <span className="flex-1 text-[14px] font-bold text-chili">退出登录</span>
            </button>
          )}
        </section>

        <div className="mt-6 mb-2 flex gap-2 rounded-2xl bg-ink/5 p-4 text-[12px] leading-relaxed text-ink/50">
          <Info size={16} className="mt-0.5 shrink-0" />
          本应用为产品原型，赛程、比分、球员与资讯均为示例数据，非官方信息。接入真实数据源后即可替换。
        </div>
      </Sheet>
    </div>
  );
}
