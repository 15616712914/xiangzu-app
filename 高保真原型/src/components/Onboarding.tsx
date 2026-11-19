import { Check } from "lucide-react";
import { useState } from "react";
import { HERO_IMAGE } from "../data/news";
import { TEAMS } from "../data/teams";
import { Img } from "./Img";
import { Crest } from "./ui";

export function Onboarding({ onDone }: { onDone: (teamId: string | null) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="animate-fade-in fixed inset-y-0 left-1/2 z-[60] flex w-full max-w-[440px] -translate-x-1/2 flex-col overflow-y-auto bg-ink text-white">
      <div className="relative h-60 shrink-0">
        <Img
          src={HERO_IMAGE}
          alt="灯光下的足球场"
          className="absolute inset-0 size-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-chili/40 via-ink/50 to-ink" />
        <div className="relative flex h-full flex-col justify-end px-6 pb-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-chili text-[22px] font-black shadow-[0_8px_24px_-6px_rgba(215,38,30,0.9)]">
            湘
          </div>
          <h1 className="mt-4 text-[30px] leading-tight font-black">欢迎来到湘超</h1>
          <p className="mt-1 text-[14px] text-white/65">
            十四市州，为城市荣誉而战。先选一支你支持的球队吧。
          </p>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-4 content-start gap-2 px-6 pt-4">
        {TEAMS.map((t) => {
          const active = picked === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setPicked(active ? null : t.id)}
              className={`relative flex flex-col items-center gap-1.5 rounded-2xl py-3 transition ${
                active ? "bg-white text-ink" : "bg-white/6 text-white/85 hover:bg-white/10"
              }`}
            >
              <Crest team={t} size={30} />
              <span className="text-[12px] font-bold">{t.city}</span>
              {active && (
                <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-chili text-white">
                  <Check size={10} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-0 bg-gradient-to-t from-ink via-ink to-transparent px-6 pt-6 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
        <button
          type="button"
          disabled={!picked}
          onClick={() => onDone(picked)}
          className="w-full rounded-full bg-chili py-3.5 text-[16px] font-black transition disabled:bg-white/10 disabled:text-white/35"
        >
          {picked ? `支持${TEAMS.find((t) => t.id === picked)!.city}，进入湘超` : "选择一支主队"}
        </button>
        <button
          type="button"
          onClick={() => onDone(null)}
          className="mt-2 w-full py-2 text-[13px] text-white/45"
        >
          先随便逛逛
        </button>
      </div>
    </div>
  );
}
