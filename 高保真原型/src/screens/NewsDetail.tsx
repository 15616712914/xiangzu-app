import { Img } from "../components/Img";
import { Overlay } from "../components/ui";
import { NEWS } from "../data/news";

export function NewsDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const n = NEWS.find((x) => x.id === id)!;
  return (
    <Overlay onBack={onBack} tone="dark" share={{ title: n.title, text: `【湘超资讯】${n.title}` }}>
      <div className="relative aspect-[4/3]">
        <Img src={n.image} alt={n.imageAlt} className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-paper" />
      </div>
      <article className="-mt-10 px-5 pb-12">
        <span className="relative rounded-full bg-chili px-2.5 py-1 text-[11px] font-bold text-white">
          {n.tag}
        </span>
        <h1 className="mt-3 text-[24px] leading-snug font-black text-ink">{n.title}</h1>
        <div className="mt-2 text-[12px] text-ink/40">
          湘超资讯 · {n.time} · {n.reads} 阅读
        </div>
        <p className="mt-5 border-l-[3px] border-chili pl-3 text-[15px] leading-relaxed font-medium text-ink/70">
          {n.summary}
        </p>
        <div className="mt-5 space-y-4 text-[16px] leading-[1.85] text-ink/85">
          {n.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </article>
    </Overlay>
  );
}
