import { createContext, useContext } from "react";

export type View =
  | { type: "match"; id: string; tab?: "ai" }
  | { type: "team"; id: string }
  | { type: "news"; id: string }
  | { type: "player"; id: string }
  | { type: "search"; id: string }
  | { type: "login"; id: string }
  | { type: "chat"; id: string }
  | { type: "notifications"; id: string }
  | { type: "privacy"; id: string }
  | { type: "poster"; id: string }
  | { type: "bracket"; id: string };

export type User = { nick: string; phone: string };
export type Settings = { goal: boolean; kickoff: boolean; fav: boolean; news: boolean };
export type MyComment = { id: string; text: string; ts: number };

export type AppState = {
  liveMinute: number;
  favTeam: string | null;
  setFavTeam: (id: string | null) => void;
  reminders: string[];
  toggleRemind: (matchId: string) => void;
  votes: Record<string, "home" | "draw" | "away">;
  vote: (matchId: string, choice: "home" | "draw" | "away") => void;
  open: (view: View) => void;
  toast: (msg: string) => void;
  share: (title: string, text: string) => void;
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  /** Returns true when signed in; otherwise opens the login screen. */
  requireLogin: () => boolean;
  guesses: Record<string, [number, number]>;
  setGuess: (matchId: string, guess: [number, number]) => void;
  cheers: Record<string, number>;
  cheersToday: number;
  cheer: (teamId: string) => void;
  myComments: Record<string, MyComment[]>;
  addComment: (matchId: string, text: string) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
  readNotifs: string[];
  markRead: (id: string) => void;
};

export const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppContext");
  return ctx;
}
