import { MATCHES, PLAYER_MAP } from "../data/league";
import { NEWS } from "../data/news";
import { TEAM_MAP } from "../data/teams";
import type { View } from "../state";

export type Tab = "home" | "table" | "fans" | "discover" | "me";
export type Route = { tab: Tab; stack: View[] };

const TABS: Tab[] = ["home", "table", "fans", "discover", "me"];

const exists: Record<View["type"], (id: string) => boolean> = {
  match: (id) => MATCHES.some((m) => m.id === id),
  team: (id) => id in TEAM_MAP,
  player: (id) => id in PLAYER_MAP,
  news: (id) => NEWS.some((n) => n.id === id),
  search: () => true,
  login: () => true,
  chat: () => true,
  notifications: () => true,
  privacy: () => true,
  bracket: () => true,
  poster: (id) => MATCHES.some((m) => m.id === id),
};

/** `#/home/match/r9-3/player/yz-14` → { tab: "home", stack: [match r9-3, player yz-14] } */
export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const tab = TABS.includes(parts[0] as Tab) ? (parts[0] as Tab) : "home";
  const stack: View[] = [];
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const type = parts[i] as View["type"];
    const id = parts[i + 1];
    if (!(type in exists) || !exists[type](id)) break;
    stack.push({ type, id } as View);
  }
  return { tab, stack };
}

export function toHash({ tab, stack }: Route) {
  return `#/${tab}${stack.map((v) => `/${v.type}/${encodeURIComponent(v.id)}`).join("")}`;
}
