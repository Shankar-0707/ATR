import { useState, type ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Activity,
  BarChart2,
  Bell,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./hooks/useAuth.js";
import { useJobsList } from "./hooks/useJobs.js";
import { useJobSocket } from "./hooks/useSocket.js";
import { useUpgrade } from "./hooks/useUpgrade.js";
import { fetchUsage } from "./api/usage.api.js";
import { Login } from "./pages/Login.js";
import { Register } from "./pages/Register.js";
import { Dashboard } from "./pages/Dashboard.js";
import { NewJob } from "./pages/NewJob.js";
import { JobResult } from "./pages/JobResult.js";
import { Admin } from "./pages/Admin.js";
import { ToastContainer } from "./components/Toast.js";

function SocketBridge() {
  const { user } = useAuth();
  useJobSocket(Boolean(user));
  return null;
}

function Protected({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-white pulse-dot"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function NavItem({
  to,
  icon: Icon,
  label,
  active,
  compact = false,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  compact?: boolean;
}) {
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav(to)}
      className={`w-full cursor-pointer rounded-md text-sm font-medium transition-all duration-150
        ${compact ? "flex flex-col items-center justify-center gap-1 px-2 py-3 text-[11px]" : "flex items-center gap-3 px-3 py-2.5"}
        ${active
          ? "border border-zinc-700 bg-zinc-800/50 text-zinc-300"
          : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
        }`}
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
}

function Sidebar() {
  const { user, logout } = useAuth();
  const { handleUpgrade } = useUpgrade();
  const location = useLocation();
  const usage = useQuery({
    queryKey: ["usage"],
    queryFn: fetchUsage,
    enabled: Boolean(user),
    refetchInterval: 30_000,
  });

  const pct = usage.data
    ? Math.min(100, (usage.data.jobsCreatedToday / usage.data.dailyJobLimit) * 100)
    : 0;

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-52 flex-col border-r border-zinc-800 bg-black md:flex">
      <div className="border-b border-zinc-800 px-4 pb-4 pt-6">
        <div className="mb-1 flex items-center gap-2">
          <img src="/logo.png" alt="TaskPilot" className="h-7 w-7 rounded-md object-contain" />
          <span className="text-sm font-bold tracking-wide text-white">TaskPilot</span>
        </div>
        {user && (
          <span className="ml-9 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            {user.plan} plan
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === "/"} />
        <NavItem to="/jobs/new" icon={PlusCircle} label="New Job" active={location.pathname === "/jobs/new"} />
        {user?.plan === "admin" && (
          <NavItem to="/admin" icon={ShieldCheck} label="Admin" active={location.pathname === "/admin"} />
        )}
      </nav>

      {usage.data && (
        <div className="border-t border-zinc-800 px-4 py-3">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-gray-500">
            Usage: {usage.data.jobsCreatedToday} / {usage.data.dailyJobLimit} jobs
          </p>
          <div className="h-1.5 overflow-hidden rounded-md bg-white/10">
            <div
              className="h-full rounded-md bg-white transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          {user?.plan === "free" && (
            <button
              onClick={handleUpgrade}
              className="mt-3 w-full rounded-md bg-white py-1.5 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
            >
              Upgrade to Pro
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1 border-t border-zinc-800 px-3 py-3">
        {user && (
          <button
            onClick={() => logout.mutate()}
            className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-500 transition-all duration-150 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={16} />
            Log out
          </button>
        )}
      </div>
    </aside>
  );
}

function Topbar() {
  const { user, logout } = useAuth();
  const { handleUpgrade } = useUpgrade();
  const location = useLocation();
  const navigate = useNavigate();
  const usage = useQuery({
    queryKey: ["usage"],
    queryFn: fetchUsage,
    enabled: Boolean(user),
  });
  const { data: jobsResp } = useJobsList();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const crumbs: Record<string, string> = {
    "/": "User Console",
    "/jobs/new": "Create New Job",
    "/admin": "Admin Control",
  };
  const title = crumbs[location.pathname] ?? "TaskPilot Console";

  const notifications = jobsResp?.items
    ? jobsResp.items.filter((j) => j.status === "completed" || j.status === "failed").slice(0, 5)
    : [];

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-800 bg-black/85 px-4 backdrop-blur md:left-52 md:h-14 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <img src="/logo.png" alt="TaskPilot" className="h-6 w-6 object-contain md:hidden" />
        <span className="block truncate text-sm font-semibold text-gray-200">{title}</span>
        {user && (
          <span className="text-[10px] uppercase tracking-[0.22em] text-gray-600 md:hidden">
            {user.plan} plan
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        {usage.data && (
          <span className="hidden text-xs text-gray-400 lg:inline">
            Usage: {usage.data.jobsCreatedToday} / {usage.data.dailyJobLimit} jobs
          </span>
        )}

        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative text-gray-400 transition-colors hover:text-gray-200 focus:outline-none"
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="pulse-dot absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-white" />
            )}
          </button>

          {isNotificationsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
              <div className="absolute right-0 top-10 z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-zinc-800 bg-[#0a0a0a] py-2 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800/50 px-4 py-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">Notifications</span>
                  {notifications.length > 0 && (
                    <span className="rounded bg-zinc-800 px-1.5 text-[10px] text-gray-400">
                      {notifications.length} New
                    </span>
                  )}
                </div>
                <div className="max-h-[min(55vh,300px)] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex items-center justify-center px-4 py-8 text-xs text-gray-500">
                      No recent notifications
                    </div>
                  ) : (
                    notifications.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          navigate(`/jobs/${job.id}`);
                        }}
                        className="flex w-full flex-col gap-1 border-b border-zinc-800/50 px-4 py-3 text-left transition-colors hover:bg-zinc-800/30"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium capitalize text-gray-200">{job.type} Job</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              job.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-500"
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>
                        <span className="line-clamp-2 text-xs text-gray-500">
                          {job.status === "completed"
                            ? "Your task has finished successfully. Tap to view the result."
                            : "Your task experienced an error."}
                        </span>
                      </button>
                    ))
                  )}
                  {user?.plan === "free" &&
                    usage.data &&
                    usage.data.jobsCreatedToday >= usage.data.dailyJobLimit && (
                      <div className="border-t border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                        <strong>System Alert:</strong> You have reached your daily job limit ({usage.data.dailyJobLimit}).
                      </div>
                    )}
                </div>
              </div>
            </>
          )}
        </div>

        {user && (
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 transition-opacity hover:opacity-80 focus:outline-none"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-bold text-white">
                {user.email[0].toUpperCase()}
              </div>
              {user.plan !== "free" && (
                <span className="hidden rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400 sm:inline">
                  {user.plan}
                </span>
              )}
            </button>

            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                <div className="absolute right-0 top-12 z-50 w-[min(16rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-zinc-800 bg-[#0a0a0a] py-2 shadow-xl">
                  <div className="border-b border-zinc-800/50 px-4 py-3">
                    <p className="break-all text-sm font-medium text-white">{user.email}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {user.plan} plan
                    </p>
                  </div>

                  {usage.data && (
                    <div className="flex flex-col gap-2.5 border-b border-zinc-800/50 px-4 py-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-gray-400">
                          <Activity size={14} /> Jobs Today
                        </span>
                        <span className="font-medium text-gray-200">{usage.data.jobsCreatedToday}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-gray-400">
                          <BarChart2 size={14} /> Daily Limit
                        </span>
                        <span className="font-medium text-gray-200">{usage.data.dailyJobLimit}</span>
                      </div>
                    </div>
                  )}

                  <div className="px-2 pt-2">
                    {user?.plan === "free" && (
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          handleUpgrade();
                        }}
                        className="mb-1 flex w-full items-center gap-2 rounded-md bg-white px-3 py-2 text-left text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
                      >
                        <Zap size={14} fill="currentColor" />
                        Upgrade to Pro
                      </button>
                    )}
                    <button
                      onClick={() => setIsProfileOpen(false)}
                      className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-zinc-800/50 hover:text-white"
                    >
                      Close Menu
                    </button>
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        logout.mutate();
                      }}
                      className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
                    >
                      Log out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-zinc-800/80 bg-black/90 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur md:hidden">
      <div className={`grid gap-2 ${user.plan === "admin" ? "grid-cols-3" : "grid-cols-2"}`}>
        <NavItem
          to="/"
          icon={LayoutDashboard}
          label="Dashboard"
          active={location.pathname === "/"}
          compact
        />
        <NavItem
          to="/jobs/new"
          icon={PlusCircle}
          label="New Job"
          active={location.pathname === "/jobs/new"}
          compact
        />
        {user.plan === "admin" && (
          <NavItem
            to="/admin"
            icon={ShieldCheck}
            label="Admin"
            active={location.pathname === "/admin"}
            compact
          />
        )}
      </div>
    </nav>
  );
}

function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <>{children}</>;

  return (
    <div className="relative left-0 top-0 min-h-screen w-full overflow-x-hidden bg-black">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -right-[15vw] -top-[20vh] h-[60vh] w-[60vw] rotate-12 rounded-[100%] bg-gradient-to-br from-zinc-800/40 via-zinc-900/20 to-transparent opacity-60 blur-3xl" />
        <div className="absolute -bottom-[20vh] -left-[10vw] h-[50vh] w-[50vw] -rotate-12 rounded-[100%] bg-gradient-to-tr from-zinc-800/40 via-zinc-900/20 to-transparent opacity-60 blur-3xl" />
      </div>

      <div className="relative z-10 flex h-full w-full flex-col">
        <Sidebar />
        <Topbar />
        <main className="relative z-10 min-h-screen pb-24 pt-16 md:ml-52 md:pb-0 md:pt-14">
          {children}
        </main>
        <footer className="relative z-10 hidden items-center justify-between border-t border-zinc-800/60 bg-black/50 px-8 py-4 text-[11px] text-gray-600 backdrop-blur-md md:ml-52 md:flex">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="pulse-dot h-1.5 w-1.5 rounded-md bg-emerald-500" />
              System Latency: 42ms
            </span>
            <span>End-to-end encrypted</span>
          </div>
          <span>(c) 2026 TaskPilot</span>
        </footer>
        <MobileBottomNav />
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <SocketBridge />
        <ToastContainer />
        <Routes>
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/jobs/new" element={<Protected><NewJob /></Protected>} />
          <Route path="/jobs/:id" element={<Protected><JobResult /></Protected>} />
          <Route path="/admin" element={<Protected><Admin /></Protected>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
