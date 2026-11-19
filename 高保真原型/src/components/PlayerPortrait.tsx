import { useId } from "react";
import { TEAM_MAP, type Player } from "../data/teams";

/** Real photo when available, otherwise a team-colored jersey silhouette with the shirt number. */
export function PlayerPortrait({ player, className = "" }: { player: Player; className?: string }) {
  const team = TEAM_MAP[player.teamId];
  const gid = useId();
  if (player.photo) {
    return (
      <img
        src={player.photo}
        alt={`${team.city}队 ${player.number}号 ${player.name}`}
        className={`object-cover ${className}`}
      />
    );
  }
  return (
    <svg
      viewBox="0 0 120 160"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${player.name}（暂无照片）`}
      className={className}
    >
      <defs>
        <linearGradient id={`${gid}-bg`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={team.color} />
          <stop
            offset="1"
            style={{ stopColor: `color-mix(in srgb, ${team.color} 35%, #0b0907)` }}
          />
        </linearGradient>
        <radialGradient id={`${gid}-glow`} cx="0.5" cy="0.35" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="160" fill={`url(#${gid}-bg)`} />
      <rect width="120" height="160" fill={`url(#${gid}-glow)`} />
      <text
        x="60"
        y="92"
        textAnchor="middle"
        fontSize="96"
        fontWeight="700"
        fill="#fff"
        opacity="0.09"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {player.number}
      </text>
      {/* neck + head */}
      <path d="M51 86 h18 v14 h-18z" fill="#d9c3a7" />
      <ellipse cx="60" cy="66" rx="19" ry="22" fill="#e6d1b5" />
      <path d="M41 62 C41 44 79 42 79 60 C76 52 66 49 60 50 C52 50 44 54 41 62Z" fill="#1d1712" />
      {/* jersey */}
      <path
        d="M10 160 C12 122 30 104 50 98 L60 106 L70 98 C90 104 108 122 110 160Z"
        fill={team.color}
      />
      <path
        d="M10 160 C12 122 30 104 50 98 L60 106 L70 98 C90 104 108 122 110 160Z"
        fill="#000"
        opacity="0.18"
      />
      <path d="M50 98 L60 106 L70 98 L67 96 L60 101 L53 96Z" fill={team.accent} />
      <path
        d="M26 112 L38 160 H31 L21 118Z M94 112 L82 160 H89 L99 118Z"
        fill={team.accent}
        opacity="0.75"
      />
      <text
        x="60"
        y="142"
        textAnchor="middle"
        fontSize="26"
        fontWeight="700"
        fill={team.accent}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {player.number}
      </text>
    </svg>
  );
}
