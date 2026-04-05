import { FormEvent, useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { Mail, Lock, ArrowRight, Zap } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { WavyBackground } from "@/components/ui/wavy-background.js";

export function Register() {
  const nav = useNavigate();
  const { register, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    register.mutate(
      { email, password },
      {
        onSuccess: () => nav("/", { replace: true }),
        onError: (e: unknown) =>
          setErr(e instanceof Error ? e.message : "Request failed"),
      },
    );
  }

  return (
    <WavyBackground>
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center mb-8 slide-in">
       
        <h1 className="text-2xl font-bold text-white tracking-tight">Task Runner</h1>
      </div>

      <div className="w-full max-w-md bg-[#000000] border border-zinc-800 rounded-2xl p-7 slide-in shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-1">Create account</h2>
        {/* <p className="text-sm text-gray-500 mb-6">Start orchestrating AI tasks in seconds.</p> */}

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
                className="w-full bg-black border border-zinc-800 rounded-md pl-9 pr-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold mb-1.5 block">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className="w-full bg-black border border-zinc-800 rounded-md pl-9 pr-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
              />
            </div>
          </div>

          {err && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={register.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-white text-black hover:bg-zinc-200 disabled:opacity-60 font-semibold text-sm transition-all duration-150 mt-1"
          >
            {register.isPending ? (
              <span className="flex gap-1">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-md bg-white pulse-dot" style={{ animationDelay: `${i*0.15}s` }} />
                ))}
              </span>
            ) : (
              <>Create account <ArrowRight size={15} /></>
            )}
          </button>
        </form>
      </div>

      <p className="mt-5 text-sm text-gray-600">
        Already have an account?{" "}
        <Link to="/login" className="text-zinc-400 hover:text-zinc-300 font-medium">
          Sign in
        </Link>
      </p>
    </div>
    </WavyBackground>
  );
}
