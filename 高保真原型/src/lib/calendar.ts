import type { Match } from "../data/league";
import { TEAM_MAP } from "../data/teams";

// Kickoff times are Beijing time (UTC+8); events are written in UTC so every calendar app agrees.
function utcStamp(date: string, time: string, addMinutes = 0) {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const t = new Date(Date.UTC(y, mo - 1, d, h - 8, mi + addMinutes));
  return t
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escape(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/([,;])/g, "\\$1")
    .replace(/\n/g, "\\n");
}

export function buildIcs(matches: Match[], calendarName = "湘超赛程") {
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Xiangchao//Schedule//CN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(calendarName)}`,
  ];
  for (const m of matches) {
    const home = TEAM_MAP[m.home];
    const away = TEAM_MAP[m.away];
    const title = `湘超第${m.round}轮 ${home.city} vs ${away.city}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${m.id}@xiangchao`,
      `DTSTAMP:${now}`,
      `DTSTART:${utcStamp(m.date, m.time)}`,
      `DTEND:${utcStamp(m.date, m.time, 120)}`,
      `SUMMARY:${escape(title)}`,
      `LOCATION:${escape(home.stadium)}`,
      `DESCRIPTION:${escape(`${home.city}队主场迎战${away.city}队`)}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT30M",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escape(`${title} 30 分钟后开赛`)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(matches: Match[], filename: string, calendarName?: string) {
  const blob = new Blob([buildIcs(matches, calendarName)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
