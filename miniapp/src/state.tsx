import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { MATCHES, type Match } from './data/league'
import { fetchLeague } from './lib/api'
import { CHEER_DAILY_LIMIT } from './data/fans'
import { TEAM_MAP } from './data/teams'

export type View =
  | { type: 'match'; id: string; tab?: 'ai' }
  | { type: 'team'; id: string }
  | { type: 'news'; id: string }
  | { type: 'player'; id: string }
  | { type: 'search'; id: string }
  | { type: 'login'; id: string }
  | { type: 'chat'; id: string }
  | { type: 'notifications'; id: string }
  | { type: 'privacy'; id: string }
  | { type: 'poster'; id: string }
  | { type: 'bracket'; id: string }

export type User = { nick: string; phone: string }
export type Settings = { goal: boolean; kickoff: boolean; fav: boolean; news: boolean }
export type MyComment = { id: string; text: string; ts: number }

export type AppState = {
  liveMinute: number
  /** The single source of league fixtures for every page. */
  matches: Match[]
  /** Pull the latest league data; resolves even when offline. */
  refresh: () => Promise<void>
  favTeam: string | null
  setFavTeam: (id: string | null) => void
  onboarded: boolean
  finishOnboarding: (teamId: string | null) => void
  reminders: string[]
  toggleRemind: (matchId: string) => void
  votes: Record<string, 'home' | 'draw' | 'away'>
  vote: (matchId: string, choice: 'home' | 'draw' | 'away') => void
  open: (view: View) => void
  toast: (msg: string) => void
  share: (title: string, text: string) => void
  user: User | null
  login: (user: User) => void
  logout: () => void
  requireLogin: () => boolean
  guesses: Record<string, [number, number]>
  setGuess: (matchId: string, guess: [number, number]) => void
  cheers: Record<string, number>
  cheersToday: number
  cheer: (teamId: string) => void
  myComments: Record<string, MyComment[]>
  addComment: (matchId: string, text: string) => void
  settings: Settings
  setSettings: (s: Settings) => void
  readNotifs: string[]
  markRead: (id: string) => void
}

const AppContext = createContext<AppState | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = Taro.getStorageSync(key)
      return raw === '' || raw == null ? initial : (raw as T)
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      Taro.setStorageSync(key, value)
    } catch {
      // Storage can be unavailable; keep the in-memory state.
    }
  }, [key, value])
  return [value, setValue] as const
}

function localDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const LIVE_MATCH =
  MATCHES.find((m) => m.status === 'live') ??
  MATCHES.find((m) => m.status === 'upcoming') ??
  MATCHES[0]

const ROUTES: Record<View['type'], string> = {
  match: '/pages/match/index',
  team: '/pages/team/index',
  news: '/pages/news/index',
  player: '/pages/player/index',
  search: '/pages/search/index',
  login: '/pages/login/index',
  chat: '/pages/chat/index',
  notifications: '/pages/notifications/index',
  privacy: '/pages/privacy/index',
  poster: '/pages/poster/index',
  bracket: '/pages/bracket/index',
}

export function AppProvider({ children }: { children?: React.ReactNode }) {
  const [favTeam, setFavTeam] = useStored<string | null>('xiangchao:fav', null)
  const [onboarded, setOnboarded] = useStored<boolean>('xiangchao:onboarded', false)
  const [reminders, setReminders] = useStored<string[]>('xiangchao:reminders', [])
  const [votes, setVotes] = useStored<AppState['votes']>('xiangchao:votes', {})
  const [user, setUser] = useStored<User | null>('xiangchao:user', null)
  const [guesses, setGuesses] = useStored<AppState['guesses']>('xiangchao:guesses', {})
  const [cheers, setCheers] = useStored<Record<string, number>>('xiangchao:cheers', {})
  const [cheerDay, setCheerDay] = useStored<{ date: string; n: number }>('xiangchao:cheer-day', {
    date: localDate(),
    n: 0,
  })
  const [myComments, setMyComments] = useStored<Record<string, MyComment[]>>(
    'xiangchao:comments',
    {},
  )
  const [settings, setSettings] = useStored<Settings>('xiangchao:settings', {
    goal: true,
    kickoff: true,
    fav: true,
    news: false,
  })
  const [readNotifs, setReadNotifs] = useStored<string[]>('xiangchao:read', [])
  const [liveMinute, setLiveMinute] = useState(LIVE_MATCH.startMinute ?? 60)
  const [matches, setMatches] = useState<Match[]>(MATCHES)

  const today = localDate()
  const cheersToday = cheerDay.date === today ? cheerDay.n : 0
  const hasLive = matches.some((m) => m.status === 'live')

  useEffect(() => {
    if (!hasLive) return
    const t = setInterval(() => setLiveMinute((m) => (m >= 90 ? 90 : m + 1)), 4000)
    return () => clearInterval(t)
  }, [hasLive])

  const fetching = useRef(false)

  // Remote data replaces the seed only when it actually arrives; offline keeps the demo usable.
  const refresh = useCallback(async () => {
    if (fetching.current || !process.env.TARO_APP_API) return
    fetching.current = true
    try {
      const remote = await fetchLeague()
      if (remote && remote.matches.length > 0) setMatches(remote.matches)
    } finally {
      fetching.current = false
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!hasLive) return
    const t = setInterval(() => void refresh(), 30000)
    return () => clearInterval(t)
  }, [hasLive, refresh])

  const toast = useCallback((msg: string) => {
    Taro.showToast({ title: msg, icon: 'none', duration: 1800 })
  }, [])

  const finishOnboarding = useCallback(
    (teamId: string | null) => {
      setOnboarded(true)
      if (teamId) {
        setFavTeam(teamId)
        toast(`欢迎加入${TEAM_MAP[teamId].city}球迷大家庭`)
      }
    },
    [setOnboarded, setFavTeam, toast],
  )

  const navigate = useCallback((view: View) => {
    const query = [`id=${encodeURIComponent(view.id)}`]
    if (view.type === 'match' && view.tab) query.push(`tab=${view.tab}`)
    Taro.navigateTo({ url: `${ROUTES[view.type]}?${query.join('&')}` })
  }, [])

  const toggleRemind = useCallback(
    (id: string) => {
      const m = matches.find((x) => x.id === id)
      if (!m) return
      const label = `${TEAM_MAP[m.home].city} vs ${TEAM_MAP[m.away].city}`
      setReminders((prev) => {
        const on = prev.includes(id)
        toast(on ? `已取消提醒：${label}` : `已加入提醒：${label}`)
        return on ? prev.filter((x) => x !== id) : [...prev, id]
      })
    },
    [matches, setReminders, toast],
  )

  const ctx = useMemo<AppState>(
    () => ({
      liveMinute,
      matches,
      refresh,
      favTeam,
      setFavTeam,
      onboarded,
      finishOnboarding,
      reminders,
      toggleRemind,
      votes,
      vote: (id, choice) => setVotes((v) => ({ ...v, [id]: choice })),
      open: navigate,
      toast,
      share: (title, text) =>
        void Taro.setClipboardData({ data: `${title} ${text}` }).then(() =>
          toast('内容已复制，去微信里分享给球友吧'),
        ),
      user,
      login: setUser,
      logout: () => setUser(null),
      requireLogin: () => {
        if (user) return true
        toast('请先登录')
        navigate({ type: 'login', id: 'me' })
        return false
      },
      guesses,
      setGuess: (id, g) => setGuesses((all) => ({ ...all, [id]: g })),
      cheers,
      cheersToday,
      cheer: (teamId) => {
        if (!user) {
          toast('请先登录')
          navigate({ type: 'login', id: 'me' })
          return
        }
        if (cheersToday >= CHEER_DAILY_LIMIT) return
        setCheers((c) => ({ ...c, [teamId]: (c[teamId] ?? 0) + 1 }))
        setCheerDay({ date: today, n: cheersToday + 1 })
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
    }),
    [
      liveMinute,
      matches,
      refresh,
      favTeam,
      setFavTeam,
      onboarded,
      finishOnboarding,
      reminders,
      toggleRemind,
      votes,
      setVotes,
      navigate,
      toast,
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
  )

  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>
}
