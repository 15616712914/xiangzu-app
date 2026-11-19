import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { PlayerPortrait } from "../components/PlayerPortrait";
import { Crest, Overlay } from "../components/ui";
import { MATCHES, PLAYER_MAP, computeScorers, formatDate, score } from "../data/league";
import { TEAMS, TEAM_MAP } from "../data/teams";
import { useApp } from "../state";

const ALL_PLAYERS = Object.values(PLAYER_MAP);

export function SearchScreen({ onBack }: { onBack: () => void }) {
  const app = useApp();
  const [q, setQ] = useState("");
  const query = q.trim();
  const hot = useMemo(() => {
    const names = computeScorers(MATCHES)
      .slice(0, 3)
      .map((s) => s.player.name);
    const fav = app.favTeam ? [TEAM_MAP[app.favTeam].city] : [];
    return [...new Set([...fav, "永州", "长沙", ...names])];
  }, [app.favTeam]);

  const results = useMemo(() => {
    if (!query) return null;
    const num = query.replace(/号$/, "");
    const teams = TEAMS.filter(
      (t) => t.city.includes(query) || t.alias.includes(query) || query.includes(t.city),
    );
    const teamIds = new Set(teams.map((t) => t.id));
    const players = ALL_PLAYERS.filter(
      (p) =>
        p.name.includes(query) ||
        (/^\d+$/.test(num) && String(p.number) === num) ||
        p.job.includes(query),
    ).slice(0, 30);
    const matches = MATCHES.filter((m) => teamIds.has(m.home) || teamIds.has(m.away)).slice(0, 13);
    return { teams, players, matches };
  }, [query]);

  const empty =
    results && !results.teams.length && !results.players.length && !results.matches.length;

  return (
    <Overlay
      onBack={onBack}
      header={
        <label className="flex h-9 flex-1 items-center gap-2 rounded-full bg-white px-3 ring-1 ring-ink/8">
          <Search size={16} className="text-ink/40" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索球队、球员、号码或职业"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink/35"
          />
          {q && (
            <button
              type="button"
              aria-label="清空"
              onClick={() => setQ("")}
              className="text-ink/40"
            >
              <X size={16} />
            </button>
          )}
        </label>
      }
    >
      <div className="px-5 pt-16 pb-12">
        {!results && (
          <>
            <div className="text-[13px] font-bold text-ink/50">热门搜索</div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {hot.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setQ(h)}
                  className="rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium text-ink/75 ring-1 ring-ink/8"
                >
                  {h}
                </button>
              ))}
            </div>
            <p className="mt-6 text-[12px] text-ink/40">
              小技巧：输入“10号”查找所有 10 号球员，输入“老师”看看哪些球员是教师。
            </p>
          </>
        )}

        {empty && (
          <p className="py-16 text-center text-[14px] text-ink/40">没有找到“{query}”相关的内容</p>
        )}

        {results && results.teams.length > 0 && (
          <Group title="球队">
            {results.teams.map((t) => (
              <Row key={t.id} onClick={() => app.open({ type: "team", id: t.id })}>
                <Crest team={t} size={30} />
                <div className="flex-1">
                  <div className="text-[15px] font-bold text-ink">{t.city}队</div>
                  <div className="text-[12px] text-ink/45">
                    {t.alias} · {t.stadium}
                  </div>
                </div>
              </Row>
            ))}
          </Group>
        )}

        {results && results.players.length > 0 && (
          <Group title={`球员 · ${results.players.length}`}>
            {results.players.map((p) => (
              <Row key={p.id} onClick={() => app.open({ type: "player", id: p.id })}>
                <PlayerPortrait player={p} className="size-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold text-ink">{p.name}</div>
                  <div className="truncate text-[12px] text-ink/45">
                    {TEAM_MAP[p.teamId].city}队 · {p.number}号 · {p.position} · {p.job}
                  </div>
                </div>
              </Row>
            ))}
          </Group>
        )}

        {results && results.matches.length > 0 && (
          <Group title="相关比赛">
            {results.matches.map((m) => {
              const [hs, as] = score(m, app.liveMinute);
              return (
                <Row key={m.id} onClick={() => app.open({ type: "match", id: m.id })}>
                  <span className="w-12 text-[12px] text-ink/40">第{m.round}轮</span>
                  <div className="flex-1 text-[14px] font-bold text-ink">
                    {TEAM_MAP[m.home].city} {m.status === "upcoming" ? "vs" : `${hs}:${as}`}{" "}
                    {TEAM_MAP[m.away].city}
                  </div>
                  <span className="text-[11px] text-ink/40">
                    {m.status === "live" ? "进行中" : formatDate(m.date)}
                  </span>
                </Row>
              );
            })}
          </Group>
        )}
      </div>
    </Overlay>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-2 text-[13px] font-bold text-ink/50">{title}</div>
      <div className="overflow-hidden rounded-2xl bg-white shadow-soft">{children}</div>
    </section>
  );
}

function Row({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-ink/5 px-4 py-3 text-left last:border-0 hover:bg-paper/60"
    >
      {children}
    </button>
  );
}
