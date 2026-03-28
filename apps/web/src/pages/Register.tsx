import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export function Register() {
  const nav = useNavigate();
  const { register, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/" replace />;
  }

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
    <div className="page narrow">
      <h1>Create account</h1>
      <form className="form" onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
          />
        </label>
        {err ? <p className="error">{err}</p> : null}
        <button type="submit" disabled={register.isPending}>
          {register.isPending ? "Creating…" : "Register"}
        </button>
      </form>
    </div>
  );
}
