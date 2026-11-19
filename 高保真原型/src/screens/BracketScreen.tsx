import { Sparkles } from "lucide-react";
import { useMemo } from "react";
import { Crest, Overlay } from "../components/ui";
import { MATCHES, computeStandings, type Match } from "../data/league";
import { predictMatch } from "../data/predict";
import { TEAM_MAP } from "../data/teams";
import { useApp } from "../state";

type Tie = { home: string; away: string; pHome: number };

/** Knockout odds: higher seed hosts, draws are split evenly as a stand-in for extra time and penalties. */
function tie(home: string, away: string): Tie {
  const m: Match = {
    id: `ko-${home}-${away}`,
    round: 99,
    date: "2099-01-01",
    time: "19:30",
    home,
    away,
    status: "upcoming",
    events: [],
    stats: {
      possession: [50, 50],
      shots: [0, 0],
      onTarget: [0, 0],
      corners: [0, 0],
      fouls: [0, 0],
    },
    attendance: 0,
  };
  const p = predictMatch(m);
  return { home, away, pHome: p.probs.home + p.probs.draw / 2 };
}

const winner = (t: Tie) => (t.pHome >= 0.5 ? t.home : t.away);

export function BracketScreen({ onBack }: { onBack: () => void }) {
  const app = useApp();
  const rounds = useMemo(() => {
    const seeds = computeStandings(MATCHES)
      .slice(0, 8)
      .map((r) => r.teamId);
    const qf = [
      tie(seeds[0], seeds[7]),
      tie(seeds[3], seeds[4]),
      tie(seeds[1], seeds[6]),
      tie(seeds[2], seeds[5]),
    ];
    const sf = [tie(winner(qf[0]), winner(qf[1])), tie(winner(qf[2]), winner(qf[3]))];
    const final = [tie(winner(sf[0]), winner(sf[1]))];
    return {
      seeds,
      stages: [
        ["四分之一决赛", qf],
        ["半决赛", sf],
        ["决赛", final],
      ] as [string, Tie[]][],
      champion: winner(final[0]),
    };
  }, []);
  const seedOf = (id: string) => rounds.seeds.indexOf(id) + 1;

  return (
    <Overlay onBack={onBack} title="淘汰赛对阵">
      <div className="pt-16 pb-10">
        <div className="mx-5 rounded-xl bg-amber-50 px-3 py-2.5 text-[12px] leading-relaxed text-amber-800">
          示意：赛制待确认。此处假设积分榜前 8 名进入淘汰赛，按排名对阵，并用 AI 模型推演晋级走势。
        </div>
        <div className="no-scrollbar mt-4 flex gap-4 overflow-x-auto px-5 pb-2">
          {rounds.stages.map(([name, ties], si) => (
            <div key={name} className="flex w-[180px] shrink-0 flex-col">
              <div className="mb-3 text-center text-[13px] font-black text-ink">{name}</div>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {ties.map((t) => (
                  <div
                    key={`${t.home}-${t.away}`}
                    className={`overflow-hidden rounded-xl bg-white shadow-soft ${si > 0 ? "border-l-2 border-dashed border-amber-400" : ""}`}
                  >
                    {[
                      [t.home, t.pHome],
                      [t.away, 1 - t.pHome],
                    ].map(([id, p]) => {
                      const team = TEAM_MAP[id as string];
                      const fav = (p as number) >= 0.5;
                      return (
                        <button
                          key={id as string}
                          type="button"
                          onClick={() => app.open({ type: "team", id: team.id })}
                          className={`flex w-full items-center gap-2 px-2.5 py-2 text-left ${fav ? "" : "opacity-55"}`}
                        >
                          <span className="w-3 text-[10px] text-ink/35">{seedOf(team.id)}</span>
                          <Crest team={team} size={18} />
                          <span
                            className={`flex-1 text-[13px] ${fav ? "font-black text-ink" : "font-medium text-ink/70"}`}
                          >
                            {team.city}
                          </span>
                          <span className="font-display text-[13px] font-bold text-ink/60">
                            {Math.round((p as number) * 100)}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex w-[130px] shrink-0 flex-col items-center justify-center rounded-2xl bg-ink p-4 text-center text-white">
            <Sparkles size={16} className="text-amber-300" />
            <div className="mt-1 text-[11px] text-white/55">AI 预测冠军</div>
            <div className="mt-3">
              <Crest team={TEAM_MAP[rounds.champion]} size={48} />
            </div>
            <div className="mt-2 text-[17px] font-black">{TEAM_MAP[rounds.champion].city}</div>
          </div>
        </div>
        <p className="mt-3 px-5 text-[11px] text-ink/40">
          半决赛起的对阵为推演结果，虚线框表示尚未确定。预测仅供娱乐参考。
        </p>
      </div>
    </Overlay>
  );
}
