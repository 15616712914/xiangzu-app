import { Img } from "../components/Img";
import { NEWS } from "../data/news";
import { useApp } from "../state";

export function NewsScreen({ embedded = false }: { embedded?: boolean }) {
  const app = useApp();
  const [lead, ...rest] = NEWS;
  return (
    <div className={embedded ? "px-5" : "px-5 pt-5"}>
      {!embedded && (
        <>
          <h1 className="text-[26px] font-black tracking-tight text-ink">资讯</h1>
          <p className="mt-0.5 text-[12px] text-ink/45">赛事动态 · 球员故事 · 文旅攻略</p>
        </>
      )}
      <button
        type="button"
        onClick={() => app.open({ type: "news", id: lead.id })}
        className={`${embedded ? "" : "mt-4 "}block w-full overflow-hidden rounded-[22px] bg-white text-left shadow-soft`}
      >
        <div className="relative aspect-[16/10]">
          <Img src={lead.image} alt={lead.imageAlt} className="size-full object-cover" />
          <span className="absolute top-3 left-3 rounded-full bg-chili px-2.5 py-1 text-[11px] font-bold text-white">
            {lead.tag}
          </span>
        </div>
        <div className="p-4">
          <h2 className="text-[18px] leading-snug font-black text-ink">{lead.title}</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink/55">{lead.summary}</p>
          <div className="mt-3 text-[11px] text-ink/35">
            {lead.time} · {lead.reads} 阅读
          </div>
        </div>
      </button>
      <div className="mt-3 divide-y divide-ink/6">
        {rest.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => app.open({ type: "news", id: n.id })}
            className="flex w-full gap-3 py-4 text-left"
          >
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-chili">{n.tag}</span>
              <h3 className="mt-1 line-clamp-2 text-[15px] leading-snug font-bold text-ink">
                {n.title}
              </h3>
              <div className="mt-2 text-[11px] text-ink/35">
                {n.time} · {n.reads} 阅读
              </div>
            </div>
            <Img
              src={n.image}
              alt={n.imageAlt}
              className="h-[78px] w-[104px] shrink-0 rounded-xl object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
