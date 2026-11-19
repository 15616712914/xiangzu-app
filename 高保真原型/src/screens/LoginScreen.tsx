import { useEffect, useState } from "react";
import { Overlay } from "../components/ui";
import { useApp } from "../state";

export function LoginScreen({ onBack }: { onBack: () => void }) {
  const app = useApp();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [nick, setNick] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [agree, setAgree] = useState(false);
  const phoneOk = /^1\d{10}$/.test(phone);
  const ok = phoneOk && /^\d{6}$/.test(code) && agree;

  useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [countdown]);

  return (
    <Overlay onBack={onBack} title="登录">
      <div className="px-6 pt-16 pb-10">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-chili text-[26px] font-black text-white">
          湘
        </div>
        <h1 className="mt-5 text-[26px] font-black text-ink">登录湘超</h1>
        <p className="mt-1 text-[13px] text-ink/50">登录后可参与竞猜、助威和评论，数据多端同步</p>

        <div className="mt-8 space-y-3">
          <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-ink/8">
            <span className="text-[14px] font-bold text-ink/60">+86</span>
            <input
              inputMode="numeric"
              maxLength={11}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="手机号"
              className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink/30"
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-ink/8">
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="6 位验证码"
              className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink/30"
            />
            <button
              type="button"
              disabled={!phoneOk || countdown > 0}
              onClick={() => {
                setCountdown(60);
                app.toast("原型：任意 6 位数字即可登录");
              }}
              className="shrink-0 text-[14px] font-bold text-chili disabled:text-ink/30"
            >
              {countdown > 0 ? `${countdown}s` : "获取验证码"}
            </button>
          </label>
          <input
            maxLength={12}
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="球迷昵称（选填）"
            className="w-full rounded-2xl bg-white px-4 py-3.5 text-[16px] ring-1 ring-ink/8 outline-none placeholder:text-ink/30"
          />
        </div>

        <label className="mt-4 flex items-start gap-2 text-[12px] text-ink/50">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 accent-[#d7261e]"
          />
          <span>
            我已阅读并同意
            <button
              type="button"
              onClick={() => app.open({ type: "privacy", id: "policy" })}
              className="mx-0.5 font-bold text-chili"
            >
              《隐私政策》
            </button>
            和《用户协议》
          </span>
        </label>

        <button
          type="button"
          disabled={!ok}
          onClick={() => {
            app.login({ phone, nick: nick.trim() || `湘超球迷${phone.slice(-4)}` });
            app.toast("登录成功");
            onBack();
          }}
          className="mt-6 w-full rounded-full bg-chili py-3.5 text-[16px] font-black text-white disabled:bg-ink/10 disabled:text-ink/30"
        >
          登录
        </button>
        <p className="mt-4 text-center text-[11px] text-ink/35">
          原型演示：不会真的发送短信，账号仅保存在本机
        </p>
      </div>
    </Overlay>
  );
}
