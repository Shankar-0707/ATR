import type { ReactNode } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { useAuth } from "./hooks/useAuth.js";
import { useJobSocket } from "./hooks/useSocket.js";
import { Login } from "./pages/Login.js";
import { Register } from "./pages/Register.js";
import { Dashboard } from "./pages/Dashboard.js";
import { NewJob } from "./pages/NewJob.js";
import { JobResult } from "./pages/JobResult.js";
import { Admin } from "./pages/Admin.js";

function SocketBridge() {
  const { user } = useAuth();
  useJobSocket(Boolean(user));
  return null;
}

function Protected({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="page">
        <p className="muted">Loading…</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="brand">
          AI Task Runner
        </Link>
        <nav className="nav">
          {user ? (
            <>
              <Link to="/">Jobs</Link>
              <Link to="/jobs/new">New job</Link>
              {user.plan === "admin" ? (
                <Link to="/admin">Admin</Link>
              ) : null}
              <button
                type="button"
                className="linkish"
                onClick={() => logout.mutate()}
              >
                Log out
              </button>
              <span className="muted small">{user.email}</span>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <SocketBridge />
        <Routes>
          <Route
            path="/"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route
            path="/jobs/new"
            element={
              <Protected>
                <NewJob />
              </Protected>
            }
          />
          <Route
            path="/jobs/:id"
            element={
              <Protected>
                <JobResult />
              </Protected>
            }
          />
          <Route
            path="/admin"
            element={
              <Protected>
                <Admin />
              </Protected>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
