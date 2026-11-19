import { Download, Loader2, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Overlay } from "../components/ui";
import { MATCHES } from "../data/league";
import { TEAM_MAP } from "../data/teams";
import { renderPoster } from "../lib/poster";
import { useApp } from "../state";

export function PosterSheet({ id, onBack }: { id: string; onBack: () => void }) {
  const app = useApp();
  const match = MATCHES.find((m) => m.id === id)!;
  const [url, setUrl] = useState<string | null>(null);
  // Snapshot the minute so the poster doesn't re-render every live tick.
  const [minute] = useState(app.liveMinute);
  const name = `湘超-${TEAM_MAP[match.home].city}vs${TEAM_MAP[match.away].city}.png`;

  useEffect(() => {
    let alive = true;
    void renderPoster(match, minute).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [match, minute]);

  const shareImage = async () => {
    if (!url) return;
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], name, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "湘超比赛海报" });
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    app.toast("当前环境不支持直接分享图片，请先保存");
  };

  return (
    <Overlay onBack={onBack} title="分享海报">
      <div className="px-6 pt-16 pb-10">
        <div className="overflow-hidden rounded-2xl bg-ink shadow-[0_24px_48px_-24px_rgba(23,18,15,0.6)]">
          {url ? (
            <img src={url} alt="比赛分享海报" className="block w-full" />
          ) : (
            <div className="flex aspect-[720/1180] items-center justify-center text-white/60">
              <Loader2 size={24} className="animate-spin" />
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-[12px] text-ink/45">
          手机上可长按图片保存，或发送给微信好友
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            href={url ?? undefined}
            download={name}
            className={`flex items-center justify-center gap-1.5 rounded-full bg-white py-3 text-[14px] font-bold text-ink ring-1 ring-ink/10 ${url ? "" : "pointer-events-none opacity-40"}`}
          >
            <Download size={16} />
            保存图片
          </a>
          <button
            type="button"
            disabled={!url}
            onClick={shareImage}
            className="flex items-center justify-center gap-1.5 rounded-full bg-chili py-3 text-[14px] font-bold text-white disabled:opacity-40"
          >
            <Share2 size={16} />
            分享
          </button>
        </div>
      </div>
    </Overlay>
  );
}
