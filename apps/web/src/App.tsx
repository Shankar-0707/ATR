import type { ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  PlusCircle,
  ShieldCheck,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  Zap,
} from "lucide-react";
import { useAuth } from "./hooks/useAuth.js";
import { useJobSocket } from "./hooks/useSocket.js";
import { useQuery } from "@tanstack/react-query";
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
      <div className="flex items-center justify-center h-screen bg-[#0d1117]">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-500 pulse-dot"
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
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav(to)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer
        ${active
          ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
          : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
        }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function Sidebar() {
  const { user, logout } = useAuth();
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
    <aside className="fixed top-0 left-0 h-screen w-52 bg-[#0d1117] border-r border-white/5 flex flex-col z-40">
      {/* Brand */}
      <div className="px-4 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm tracking-wide">The Orchestrator</span>
        </div>
        {user && (
          <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-semibold ml-9">
            {user.plan} plan
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === "/"} />
        <NavItem to="/jobs/new" icon={PlusCircle} label="New Job" active={location.pathname === "/jobs/new"} />
        {user?.plan === "admin" && (
          <NavItem to="/admin" icon={ShieldCheck} label="Admin" active={location.pathname === "/admin"} />
        )}
      </nav>

      {/* Usage bar */}
      {usage.data && (
        <div className="px-4 py-3 border-t border-white/5">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">
            Usage: {usage.data.jobsCreatedToday} / {usage.data.dailyJobLimit} jobs
          </p>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          {user?.plan === "free" && (
            <button
              onClick={async () => {
                try {
                  const { loadRazorpayScript } = await import("./utils/razorpay.js");
                  const isLoaded = await loadRazorpayScript();
                  if (!isLoaded) throw new Error("Razorpay SDK failed to load. Check your internet connection.");

                  const { createRazorpayOrder, verifyRazorpayPayment } = await import("./api/upgrade.api.js");
                  const { showToast } = await import("./components/Toast.js");

                  const order = await createRazorpayOrder("pro");

                  const options = {
                    key: order.key_id,
                    amount: order.amount,
                    currency: order.currency,
                    name: "The Orchestrator",
                    description: "Upgrade to Pro Plan",
                    order_id: order.orderId,
                    handler: async (response: any) => {
                      try {
                        await verifyRazorpayPayment({
                          razorpay_order_id: response.razorpay_order_id,
                          razorpay_payment_id: response.razorpay_payment_id,
                          razorpay_signature: response.razorpay_signature,
                        });
                        showToast("success", "Payment successful! Your plan has been upgraded to Pro. 🎉");
                      } catch (err: any) {
                        showToast("error", err.message || "Payment verification failed.");
                      }
                    },
                    prefill: {
                      email: user?.email,
                    },
                    theme: {
                      color: "#4f46e5", // indigo-600
                    },
                  };

                  const rzp = new (window as any).Razorpay(options);
                  rzp.open();
                } catch (e: any) {
                  const { showToast } = await import("./components/Toast.js");
                  showToast("error", e.message || "Failed to initiate upgrade");
                }
              }}
              className="mt-3 w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
            >
              Upgrade to Pro
            </button>
          )}
        </div>
      )}

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-white/5 flex flex-col gap-1">
        <NavItem to="/settings" icon={Settings} label="Settings" active={false} />
        <NavItem to="/support" icon={HelpCircle} label="Support" active={false} />
        {user && (
          <button
            onClick={() => logout.mutate()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 cursor-pointer"
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
  const { user } = useAuth();
  const location = useLocation();
  const usage = useQuery({
    queryKey: ["usage"],
    queryFn: fetchUsage,
    enabled: Boolean(user),
  });

  const crumbs: Record<string, string> = {
    "/": "Orchestrator Console",
    "/jobs/new": "Create New Job",
    "/admin": "Admin Control",
  };
  const title = crumbs[location.pathname] ?? "Orchestrator Console";

  return (
    <header className="fixed top-0 left-52 right-0 h-14 bg-[#0d1117]/80 backdrop-blur border-b border-white/5 flex items-center justify-between px-6 z-30">
      <span className="text-sm font-semibold text-gray-200">{title}</span>
      <div className="flex items-center gap-4">
        {usage.data && (
          <span className="text-xs text-gray-400">
            Usage: {usage.data.jobsCreatedToday} / {usage.data.dailyJobLimit} jobs
          </span>
        )}
        <button className="relative text-gray-400 hover:text-gray-200 transition-colors">
          <Bell size={18} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-500" />
        </button>
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
              {user.email[0].toUpperCase()}
            </div>
            {user.plan !== "free" && (
              <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-400 border border-indigo-500/40 rounded px-1.5 py-0.5">
                {user.plan}
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <>{children}</>;
  return (
    <div className="min-h-screen bg-[#0d1117]">
      <Sidebar />
      <Topbar />
      <main className="ml-52 pt-14 min-h-screen">
        {children}
      </main>
      <footer className="ml-52 border-t border-white/5 px-8 py-4 flex items-center justify-between text-[11px] text-gray-600">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
            System Latency: 42ms
          </span>
          <span>End-to-end encrypted</span>
        </div>
        <span>© 2024 THE ORCHESTRATOR AI</span>
      </footer>
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
