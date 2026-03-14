import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, useLocation } from "react-router-dom";
import AppLogo from "@/components/layout/AppLogo";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isStrongPassword(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

const MAX_DISPLAY_NAME_LENGTH = 6;

function charLength(value: string) {
  return Array.from(value).length;
}

function validateSignUpForm(params: {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  const { displayName, email, password, confirmPassword } = params;

  if (!displayName.trim()) return "请输入昵称";
  if (charLength(displayName.trim()) > MAX_DISPLAY_NAME_LENGTH) {
    return `昵称需小于等于 ${MAX_DISPLAY_NAME_LENGTH} 个字符`;
  }
  if (!email.trim()) return "请输入邮箱";
  if (!isValidEmail(email)) return "请输入有效的邮箱地址";
  if (!isStrongPassword(password)) return "密码需至少 8 位，并同时包含字母和数字";
  if (!confirmPassword) return "请再次输入密码";
  if (password !== confirmPassword) return "两次输入的密码不一致";

  return null;
}

export default function LoginPage() {
  const nav = useNavigate();
  const location = useLocation() as {
    state: { from?: string };
  };

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const passwordMeetsRule = isStrongPassword(password);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMessage(null);

    if (!supabase) {
      setErr(
        "Supabase 未配置，请设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY",
      );
      return;
    }

    if (!email.trim()) {
      setErr("请输入邮箱");
      return;
    }

    if (!isValidEmail(email)) {
      setErr("请输入有效的邮箱地址");
      return;
    }

    if (!password) {
      setErr("请输入密码");
      return;
    }

    if (mode === "sign-up") {
      const validationError = validateSignUpForm({
        displayName,
        email,
        password,
        confirmPassword,
      });

      if (validationError) {
        setErr(validationError);
        return;
      }
    }

    setLoading(true);

    if (mode === "sign-in") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setLoading(false);

      if (error) {
        setErr(error.message);
        return;
      }

      if (data.session) {
        const from = location.state?.from ?? "/app";
        nav(from, { replace: true });
      }
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName.trim() || email.split("@")[0],
        },
      },
    });

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    if (data.session) {
      const from = location.state?.from ?? "/app";
      nav(from, { replace: true });
      return;
    }

    setMessage("注册成功。");
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="relative z-10 border-b border-slate-200/80 bg-[linear-gradient(180deg,#e8eef7_0%,#dce5f1_100%)] text-slate-900 shadow-[0_12px_28px_rgba(148,163,184,0.18)] dark:border-slate-700/70 dark:bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] dark:text-slate-100 dark:shadow-[0_14px_30px_rgba(2,6,23,0.45)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 py-3 text-center sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <AppLogo className="self-start sm:self-auto" imgClassName="h-10 sm:h-12 md:h-14" />
          <div className="w-full text-center text-xs font-medium tracking-[0.18em] text-slate-500 dark:text-slate-300 sm:flex-1 sm:text-sm md:text-base md:tracking-[0.26em]">
            随心记录，心随意动
          </div>
          <div className="hidden w-[104px] shrink-0 sm:block" aria-hidden="true" />
        </div>
      </header>
      <div className="relative z-10 w-full bg-white dark:bg-slate-950">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center px-4 py-6 sm:min-h-[calc(100vh-5.5rem)] sm:px-6 sm:py-10">
          <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_20px_48px_rgba(148,163,184,0.16)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_50px_rgba(2,6,23,0.5)] sm:rounded-[28px] sm:p-7">
            <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {mode === "sign-in" ? "登录" : "创建账号"}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-300">
                    {mode === "sign-in"
                      ? "继续写你的日记。"
                      : "用邮箱和密码创建新账号。"}
                  </div>
                </div>
                <div className="flex rounded-full border border-slate-200/90 bg-slate-100/80 p-1 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
                  <button
                    type="button"
                    className={`flex-1 rounded-full px-3 py-2.5 transition-colors ${
                      mode === "sign-in"
                        ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                        : "bg-white/90 text-slate-600 shadow-sm hover:bg-white hover:text-slate-900 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                    }`}
                    onClick={() => {
                      setMode("sign-in");
                      setErr(null);
                      setMessage(null);
                    }}
                  >
                    登录
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-full px-3 py-2.5 transition-colors ${
                      mode === "sign-up"
                        ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                        : "bg-white/90 text-slate-600 shadow-sm hover:bg-white hover:text-slate-900 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                    }`}
                    onClick={() => {
                      setMode("sign-up");
                      setErr(null);
                      setMessage(null);
                    }}
                  >
                    注册
                  </button>
                </div>
              </div>

              {mode === "sign-up" && (
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                  placeholder="昵称"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={MAX_DISPLAY_NAME_LENGTH}
                  autoComplete="nickname"
                />
              )}

              <input
                className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                placeholder="邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                placeholder={mode === "sign-in" ? "密码" : "设置密码"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
              />
              {mode === "sign-up" && password && (
                <div
                  className={`flex items-center gap-2 text-xs ${
                    passwordMeetsRule ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <div>密码需至少 8 位，并同时包含字母和数字。</div>
                  {passwordMeetsRule && <div aria-hidden="true">✓</div>}
                </div>
              )}
              {mode === "sign-up" && (
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                  placeholder="确认密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                />
              )}

              {err && <div className="text-sm text-red-600">{err}</div>}
              {message && <div className="text-sm text-emerald-700">{message}</div>}

              <button
                className="w-full rounded-2xl border border-slate-900 bg-slate-900 px-4 py-3 text-white transition hover:bg-slate-800 hover:border-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={loading}
                type="submit"
              >
                {loading
                  ? mode === "sign-in"
                    ? "登录中..."
                    : "注册中..."
                  : mode === "sign-in"
                    ? "登录"
                    : "注册"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
