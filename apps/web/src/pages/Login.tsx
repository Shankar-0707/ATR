import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { WavyBackground } from "@/components/ui/wavy-background.js";

export function Login() {
  const nav = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    login.mutate(
      { email, password },
      {
        onSuccess: () => nav("/", { replace: true }),
        onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Request failed"),
      },
    );
  }

  return (
    <WavyBackground>
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 py-10 sm:px-6">
        <div className="mb-8 flex max-w-md flex-col items-center text-center slide-in">
          <div className="mb-4 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-400">
            AI Workflow Studio
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Task Runner</h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            Smooth job orchestration on every screen, with a calmer mobile-first sign-in flow.
          </p>
        </div>

        <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-[#000000]/90 p-5 shadow-2xl slide-in sm:p-7">
          <h2 className="mb-1 text-lg font-semibold text-white">Welcome back</h2>
          <p className="mb-6 text-sm text-gray-500">Enter your credentials to access.</p>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                Email
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-zinc-800 bg-black py-3 pl-9 pr-3 text-sm text-gray-200 placeholder-gray-600 transition-all focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="********"
                  className="w-full rounded-xl border border-zinc-800 bg-black py-3 pl-9 pr-3 text-sm text-gray-200 placeholder-gray-600 transition-all focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
            </div>

            {err && (
              <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {err}
              </p>
            )}

            <button
              type="submit"
              disabled={login.isPending}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-black transition-all duration-150 hover:bg-zinc-200 disabled:opacity-60"
            >
              {login.isPending ? (
                <span className="flex items-center justify-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-black pulse-dot"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </span>
              ) : (
                <>
                  Login <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link to="/register" className="font-medium text-zinc-400 hover:text-zinc-300">
            Create an account
          </Link>
        </p>
      </div>
    </WavyBackground>
  );
}
