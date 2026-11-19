import { Bell, Goal, Newspaper, Trophy } from "lucide-react";
import { useMemo } from "react";
import { Overlay } from "../components/ui";
import { seedNotifications } from "../data/fans";
import { useApp } from "../state";

const ICONS = { goal: Goal, kickoff: Bell, guess: Trophy, news: Newspaper };

export function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const app = useApp();
  const list = useMemo(() => seedNotifications(app.favTeam), [app.favTeam]);
  return (
    <Overlay onBack={onBack} title="消息中心">
      <div className="px-5 pt-16 pb-10">
        <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
          {list.map((n) => {
            const Icon = ICONS[n.kind];
            const unread = !app.readNotifs.includes(n.id);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  app.markRead(n.id);
                  if (n.target) app.open(n.target);
                }}
                className="flex w-full gap-3 border-b border-ink/5 px-4 py-3.5 text-left last:border-0"
              >
                <span
                  className={`relative flex size-9 shrink-0 items-center justify-center rounded-full ${n.kind === "goal" ? "bg-chili text-white" : "bg-paper text-ink/60"}`}
                >
                  <Icon size={16} />
                  {unread && (
                    <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-chili ring-2 ring-white" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[14px] ${unread ? "font-black text-ink" : "font-bold text-ink/70"}`}
                    >
                      {n.title}
                    </span>
                    <span className="text-[11px] text-ink/35">{n.time}</span>
                  </div>
                  <p className="mt-0.5 text-[13px] text-ink/55">{n.body}</p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-center text-[11px] text-ink/35">
          原型：消息为测试数据，正式版将通过系统推送送达
        </p>
      </div>
    </Overlay>
  );
}

export function unreadCount(favTeam: string | null, read: string[]) {
  return seedNotifications(favTeam).filter((n) => !read.includes(n.id)).length;
}
