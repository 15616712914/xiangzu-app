import { Overlay } from "../components/ui";

const SECTIONS: [string, string][] = [
  [
    "我们收集哪些信息",
    "当你登录时，我们会收集手机号用于账号识别；你选择的主队、竞猜、助威和评论内容用于提供相应功能。我们不会收集与赛事服务无关的个人信息。",
  ],
  [
    "信息如何使用",
    "上述信息仅用于提供赛程提醒、竞猜排名、社区互动等服务，以及改进产品体验。未经你的同意，我们不会将个人信息提供给第三方。",
  ],
  ["信息存储与安全", "你的信息存储于中华人民共和国境内的服务器，并采取加密等安全措施进行保护。"],
  [
    "你的权利",
    "你可以随时查看、更正或删除你的个人信息，也可以注销账号。注销后我们将删除或匿名化处理你的个人信息。",
  ],
  ["联系我们", "如对本政策有任何疑问，可以通过「我的 - 意见反馈」联系我们。"],
];

export function PrivacyScreen({ onBack }: { onBack: () => void }) {
  return (
    <Overlay onBack={onBack} title="隐私政策">
      <div className="px-5 pt-16 pb-12">
        <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-[12px] text-amber-800">
          原型草稿：正式上线前需由法务根据实际业务审核定稿
        </div>
        <h1 className="mt-4 text-[22px] font-black text-ink">湘超 App 隐私政策</h1>
        <div className="mt-4 space-y-5">
          {SECTIONS.map(([t, body], i) => (
            <section key={t}>
              <h2 className="text-[15px] font-black text-ink">
                {i + 1}. {t}
              </h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink/70">{body}</p>
            </section>
          ))}
        </div>
      </div>
    </Overlay>
  );
}
