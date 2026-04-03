import { FormEvent, useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { Mail, Lock, ArrowRight, Zap } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";

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
        onError: (e: unknown) =>
          setErr(e instanceof Error ? e.message : "Request failed"),
      },
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center px-4">
      {/* Brand */}
      <div className="flex flex-col items-center mb-8 slide-in">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-4">
          <Zap size={28} className="text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Task Runner</h1>
        <p className="text-sm text-gray-500 mt-1">Mission Control for AI Operations</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-[#161b22] border border-white/8 rounded-2xl p-7 slide-in shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-1">Welcome back</h2>
        <p className="text-sm text-gray-500 mb-6">Enter your credentials to access.</p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold mb-1.5 block">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@company.com"
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">Password</label>
              {/* <button type="button" className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold uppercase tracking-widest">Forgot?</button> */}
            </div>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
            </div>
          </div>

          {err && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold text-sm transition-all duration-150 mt-1"
          >
            {login.isPending ? (
              <span className="flex gap-1">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-white pulse-dot" style={{ animationDelay: `${i*0.15}s` }} />
                ))}
              </span>
            ) : (
              <>Login <ArrowRight size={15} /></>
            )}
          </button>

          {/* <div className="relative flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-[11px] text-gray-600 uppercase tracking-widest">or continue with</span>
            <div className="flex-1 h-px bg-white/8" />
          </div> */}

          {/* <div className="grid grid-cols-2 gap-3">
            {["SSO", "API Key"].map((label) => (
              <button
                key={label}
                type="button"
                className="py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-sm text-gray-400 font-medium transition-all"
              >
                {label}
              </button>
            ))}
          </div> */}
        </form>
      </div>

      <p className="mt-5 text-sm text-gray-600">
        Don't have an account?{" "}
        <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
          Create an account
        </Link>
      </p>
{/* 
      <button className="fixed bottom-5 right-5 text-xs text-gray-600 hover:text-gray-400 flex items-center gap-1 transition-colors">
        <span className="w-4 h-4 rounded-full border border-gray-700 flex items-center justify-center text-[10px]">?</span>
        Support
      </button> */}
    </div>
  );
}
