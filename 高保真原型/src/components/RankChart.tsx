import { useMemo } from "react";
import { CURRENT_ROUND, MATCHES, computeStandings } from "../data/league";
import { TEAMS, TEAM_MAP } from "../data/teams";

/** League position after each completed round, drawn as an inverted line chart. */
export function RankChart({ teamId }: { teamId: string }) {
  const team = TEAM_MAP[teamId];
  const ranks = useMemo(() => {
    const out: number[] = [];
    for (let r = 1; r < CURRENT_ROUND; r++) {
      const table = computeStandings(MATCHES.filter((m) => m.round <= r));
      out.push(table.findIndex((x) => x.teamId === teamId) + 1);
    }
    return out;
  }, [teamId]);
  const n = TEAMS.length;
  const W = 320;
  const H = 130;
  const pad = { l: 22, r: 10, t: 10, b: 20 };
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, ranks.length - 1);
  const y = (rank: number) => pad.t + ((rank - 1) * (H - pad.t - pad.b)) / (n - 1);
  const d = ranks.map((r, i) => `${i ? "L" : "M"}${x(i)},${y(r)}`).join(" ");

  return (
    <div className="rounded-2xl bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-black text-ink">排名走势</span>
        <span className="text-[11px] text-ink/40">第1–{ranks.length}轮</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`${team.city}队各轮排名走势`}
      >
        {[1, 4, 8, 14].map((r) => (
          <g key={r}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(r)}
              y2={y(r)}
              stroke="#17120f"
              strokeOpacity="0.06"
            />
            <text x={0} y={y(r) + 3} fontSize="9" fill="#17120f" fillOpacity="0.35">
              {r}
            </text>
          </g>
        ))}
        <path
          d={d}
          fill="none"
          stroke={team.color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {ranks.map((r, i) => (
          <g key={i}>
            <circle
              cx={x(i)}
              cy={y(r)}
              r={i === ranks.length - 1 ? 4.5 : 3}
              fill={i === ranks.length - 1 ? team.color : "#fff"}
              stroke={team.color}
              strokeWidth="2"
            />
            <text
              x={x(i)}
              y={H - 4}
              fontSize="9"
              textAnchor="middle"
              fill="#17120f"
              fillOpacity="0.35"
            >
              {i + 1}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
