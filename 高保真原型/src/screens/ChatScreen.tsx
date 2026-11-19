import { Bot, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Overlay } from "../components/ui";
import { SUGGESTIONS, answer } from "../data/assistant";

type Msg = { role: "user" | "ai"; text: string };

export function ChatScreen({ onBack }: { onBack: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "ai",
      text: "你好，我是湘超 AI 球评助手。可以问我球队状态、积分排名、射手榜、球员资料和比赛预测。",
    },
  ]);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, thinking]);

  const ask = (q: string) => {
    const t = q.trim();
    if (!t || thinking) return;
    setMsgs((m) => [...m, { role: "user", text: t }]);
    setText("");
    setThinking(true);
    window.setTimeout(() => {
      setMsgs((m) => [...m, { role: "ai", text: answer(t) }]);
      setThinking(false);
    }, 700);
  };

  return (
    <Overlay onBack={onBack} title="AI 球评助手">
      <div className="flex min-h-dvh flex-col px-4 pt-14">
        <div className="flex-1 space-y-3 pb-4">
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "ai" && (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-amber-300">
                  <Bot size={16} />
                </span>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-line ${
                  m.role === "user"
                    ? "rounded-br-md bg-chili text-white"
                    : "rounded-bl-md bg-white text-ink shadow-soft"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-ink text-amber-300">
                <Bot size={16} />
              </span>
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-soft">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="size-1.5 animate-bounce rounded-full bg-ink/40"
                    style={{ animationDelay: `${d * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="sticky bottom-0 -mx-4 border-t border-ink/8 bg-paper/95 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[12px] text-ink/70 ring-1 ring-ink/8"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(text);
            }}
            className="flex items-center gap-2 rounded-full bg-white py-1.5 pr-1.5 pl-4 ring-1 ring-ink/8"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="问问 AI，比如：衡阳队状态怎么样"
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink/35"
            />
            <button
              type="submit"
              aria-label="发送"
              disabled={!text.trim() || thinking}
              className="flex size-8 items-center justify-center rounded-full bg-chili text-white disabled:bg-ink/10 disabled:text-ink/30"
            >
              <Send size={14} />
            </button>
          </form>
          <p className="mt-1.5 text-center text-[10px] text-ink/35">
            原型：基于本地数据的规则回答，正式版将接入大模型
          </p>
        </div>
      </div>
    </Overlay>
  );
}
