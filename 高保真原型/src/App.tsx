import { BarChart3, CalendarDays, Compass, Flame, UserRound, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Onboarding } from "./components/Onboarding";
import { MATCHES } from "./data/league";
import { TEAM_MAP } from "./data/teams";
import { usePersistentState } from "./hooks/usePersistentState";
import { parseHash, toHash, type Route, type Tab } from "./lib/router";
import { shareLink } from "./lib/share";
import { HomeScreen } from "./screens/HomeScreen";
import { MatchDetail } from "./screens/MatchDetail";
import { MeScreen } from "./screens/MeScreen";
import { NewsDetail } from "./screens/NewsDetail";
import { PlayerDetail } from "./screens/PlayerDetail";
import { SearchScreen } from "./screens/SearchScreen";
import { BracketScreen } from "./screens/BracketScreen";
import { ChatScreen } from "./screens/ChatScreen";
import { DiscoverScreen } from "./screens/DiscoverScreen";
import { FansScreen } from "./screens/FansScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { PosterSheet } from "./screens/PosterSheet";
import { PrivacyScreen } from "./screens/PrivacyScreen";
import { CHEER_DAILY_LIMIT } from "./data/fans";
import { TableScreen } from "./screens/TableScreen";
import { TeamDetail } from "./screens/TeamDetail";
import { AppContext, type AppState, type MyComment, type Settings, type User } from "./state";

const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "home", label: "赛事", icon: CalendarDays },
  { key: "table", label: "数据", icon: BarChart3 },
  { key: "fans", label: "球迷", icon: Flame },
  { key: "discover", label: "发现", icon: Compass },
  { key: "me", label: "我的", icon: UserRound },
];

const LIVE_MATCH = MATCHES.find((m) => m.status === "live")!;

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const { tab, stack } = route;
  const routeRef = useRef(route);
  routeRef.current = route;
  const [onboarded, setOnboarded] = usePersistentState("xiangchao:onboarded", false);
  const [favTeam, setFavTeam] = usePersistentState<string | null>("xiangchao:fav", null);
  const [reminders, setReminders] = usePersistentState<string[]>("xiangchao:reminders", []);
  const [votes, setVotes] = usePersistentState<AppState["votes"]>("xiangchao:votes", {});
  const [user, setUser] = usePersistentState<User | null>("xiangchao:user", null);
  const [guesses, setGuesses] = usePersistentState<AppState["guesses"]>("xiangchao:guesses", {});
  const [cheers, setCheers] = usePersistentState<Record<string, number>>("xiangchao:cheers", {});
  const today = new Date().toISOString().slice(0, 10);
  const [cheerDay, setCheerDay] = usePersistentState<{ date: string; n: number }>(
    "xiangchao:cheer-day",
    { date: today, n: 0 },
  );
  const cheersToday = cheerDay.date === today ? cheerDay.n : 0;
  const [myComments, setMyComments] = usePersistentState<Record<string, MyComment[]>>(
    "xiangchao:comments",
    {},
  );
  const [settings, setSettings] = usePersistentState<Settings>("xiangchao:settings", {
    goal: true,
    kickoff: true,
    fav: true,
    news: false,
  });
  const [readNotifs, setReadNotifs] = usePersistentState<string[]>("xiangchao:read", []);
  const [liveMinute, setLiveMinute] = useState(LIVE_MATCH.startMinute ?? 60);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  // Keep the URL in sync with in-app navigation so the back button and shared links work.
  useEffect(() => {
    window.history.replaceState(
      { idx: window.history.state?.idx ?? 0 },
      "",
      toHash(routeRef.current),
    );
    const onPop = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((next: Route, mode: "push" | "replace") => {
    const idx = window.history.state?.idx ?? 0;
    if (mode === "push") window.history.pushState({ idx: idx + 1 }, "", toHash(next));
    else window.history.replaceState({ idx }, "", toHash(next));
    setRoute(next);
  }, []);

  // Simulated live clock: one match minute every 4 seconds.
  useEffect(() => {
    const t = window.setInterval(() => setLiveMinute((m) => (m >= 90 ? 90 : m + 1)), 4000);
    return () => window.clearInterval(t);
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 1800);
  }, []);

  const toggleRemind = useCallback(
    (id: string) => {
      const m = MATCHES.find((x) => x.id === id)!;
      const label = `${TEAM_MAP[m.home].city} vs ${TEAM_MAP[m.away].city}`;
      setReminders((prev) => {
        const on = prev.includes(id);
        toast(on ? `已取消提醒：${label}` : `已加入提醒：${label}，可在「我的」导出到日历`);
        return on ? prev.filter((x) => x !== id) : [...prev, id];
      });
    },
    [setReminders, toast],
  );

  const ctx = useMemo<AppState>(
    () => ({
      liveMinute,
      favTeam,
      setFavTeam,
      reminders,
      toggleRemind,
      votes,
      vote: (id, choice) => setVotes((v) => ({ ...v, [id]: choice })),
      open: (view) =>
        navigate({ ...routeRef.current, stack: [...routeRef.current.stack, view] }, "push"),
      toast,
      user,
      login: setUser,
      logout: () => setUser(null),
      requireLogin: () => {
        if (user) return true;
        toast("请先登录");
        navigate(
          { ...routeRef.current, stack: [...routeRef.current.stack, { type: "login", id: "me" }] },
          "push",
        );
        return false;
      },
      guesses,
      setGuess: (id, g) => setGuesses((all) => ({ ...all, [id]: g })),
      cheers,
      cheersToday,
      cheer: (teamId) => {
        if (cheersToday >= CHEER_DAILY_LIMIT) return;
        setCheers((c) => ({ ...c, [teamId]: (c[teamId] ?? 0) + 1 }));
        setCheerDay({ date: today, n: cheersToday + 1 });
      },
      myComments,
      addComment: (matchId, text) =>
        setMyComments((all) => ({
          ...all,
          [matchId]: [
            ...(all[matchId] ?? []),
            { id: `${matchId}-me-${Date.now()}`, text, ts: Date.now() },
          ],
        })),
      settings,
      setSettings,
      readNotifs,
      markRead: (id) => setReadNotifs((r) => (r.includes(id) ? r : [...r, id])),
      share: (title, text) => {
        void shareLink(title, text).then((r) => {
          if (r === "copied") toast("链接已复制，快去分享给球友吧");
          else if (r === "failed") toast("当前环境不支持分享");
        });
      },
    }),
    [
      liveMinute,
      favTeam,
      setFavTeam,
      reminders,
      toggleRemind,
      votes,
      setVotes,
      toast,
      navigate,
      user,
      setUser,
      guesses,
      setGuesses,
      cheers,
      setCheers,
      cheersToday,
      setCheerDay,
      today,
      myComments,
      setMyComments,
      settings,
      setSettings,
      readNotifs,
      setReadNotifs,
    ],
  );

  const goTab = (t: Tab) => {
    navigate({ tab: t, stack: [] }, "replace");
    window.scrollTo({ top: 0 });
  };

  const back = () => {
    // Use real history when we pushed the entry; otherwise (deep link) step up one level.
    if ((window.history.state?.idx ?? 0) > 0) window.history.back();
    else navigate({ ...routeRef.current, stack: routeRef.current.stack.slice(0, -1) }, "replace");
  };
  const top = stack[stack.length - 1];

  useEffect(() => {
    document.body.style.overflow = top ? "hidden" : "";
  }, [top]);

  return (
    <AppContext.Provider value={ctx}>
      <div className="min-h-dvh bg-[#e9e2d4]">
        <div className="relative mx-auto min-h-dvh w-full max-w-[440px] bg-paper pb-32 shadow-[0_0_60px_-20px_rgba(23,18,15,0.25)]">
          {tab === "home" && (
            <HomeScreen
              onOpenMe={() => goTab("me")}
              onSearch={() => ctx.open({ type: "search", id: "all" })}
            />
          )}
          {tab === "table" && <TableScreen />}
          {tab === "fans" && <FansScreen />}
          {tab === "discover" && <DiscoverScreen />}
          {tab === "me" && <MeScreen />}
        </div>

        {stack.map((view, i) => {
          const key = `${view.type}-${view.id}-${i}`;
          if (view.type === "match")
            return <MatchDetail key={key} id={view.id} initialTab={view.tab} onBack={back} />;
          if (view.type === "team") return <TeamDetail key={key} id={view.id} onBack={back} />;
          if (view.type === "player") return <PlayerDetail key={key} id={view.id} onBack={back} />;
          if (view.type === "search") return <SearchScreen key={key} onBack={back} />;
          if (view.type === "login") return <LoginScreen key={key} onBack={back} />;
          if (view.type === "chat") return <ChatScreen key={key} onBack={back} />;
          if (view.type === "notifications") return <NotificationsScreen key={key} onBack={back} />;
          if (view.type === "privacy") return <PrivacyScreen key={key} onBack={back} />;
          if (view.type === "bracket") return <BracketScreen key={key} onBack={back} />;
          if (view.type === "poster") return <PosterSheet key={key} id={view.id} onBack={back} />;
          return <NewsDetail key={key} id={view.id} onBack={back} />;
        })}

        <nav className="fixed bottom-[max(env(safe-area-inset-bottom),12px)] left-1/2 z-30 w-[calc(100%-24px)] max-w-[416px] -translate-x-1/2 rounded-[24px] bg-ink/92 p-1.5 text-white shadow-float ring-1 ring-white/10 backdrop-blur-xl">
          <div className="grid grid-cols-5">
            {TABS.map(({ key, label, icon: Icon }) => {
              const active = tab === key && !top;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => goTab(key)}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 rounded-[18px] py-2 transition ${active ? "bg-chili text-white shadow-[0_8px_18px_-8px_rgba(215,38,30,0.9)]" : "text-white/45 hover:text-white/80"}`}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
                  <span className="text-[10px] font-bold">{label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {!onboarded && !favTeam && (
          <Onboarding
            onDone={(teamId) => {
              setOnboarded(true);
              if (teamId) {
                setFavTeam(teamId);
                toast(`欢迎加入${TEAM_MAP[teamId].city}球迷大家庭`);
              }
            }}
          />
        )}

        {toastMsg && (
          <div className="animate-toast pointer-events-none fixed bottom-28 left-1/2 z-50 max-w-[360px] -translate-x-1/2 rounded-full bg-ink/90 px-4 py-2.5 text-center text-[13px] font-medium text-white shadow-lg">
            {toastMsg}
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
