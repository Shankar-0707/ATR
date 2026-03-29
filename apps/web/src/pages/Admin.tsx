import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth.js";
import { Navigate } from "react-router-dom";
import * as adminApi from "../api/admin.api.js";

export function Admin() {
  const { user } = useAuth();
  const stats = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => adminApi.fetchAdminStats(),
    enabled: user?.plan === "admin",
  });
  const users = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminApi.fetchAdminUsers(25, 0),
    enabled: user?.plan === "admin",
  });
  const jobs = useQuery({
    queryKey: ["admin", "jobs"],
    queryFn: () => adminApi.fetchAdminJobs(25, 0),
    enabled: user?.plan === "admin",
  });

  if (user?.plan !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="page">
      <h1>Admin</h1>
      <p className="muted">
        Platform overview (Phase 4). Requires <code>plan: admin</code> on your
        user row.
      </p>

      <section className="admin-section">
        <h2>Stats</h2>
        {stats.isLoading ? (
          <p className="muted">Loading…</p>
        ) : stats.isError ? (
          <p className="error">Could not load stats.</p>
        ) : (
          <pre className="json-out">{JSON.stringify(stats.data, null, 2)}</pre>
        )}
      </section>

      <section className="admin-section">
        <h2>Users</h2>
        {users.isLoading ? (
          <p className="muted">Loading…</p>
        ) : users.isError ? (
          <p className="error">Could not load users.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Plan</th>
                <th>Jobs</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.data!.items.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.plan}</td>
                  <td>{u._count.jobs}</td>
                  <td className="muted small">
                    {new Date(u.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="admin-section">
        <h2>Recent jobs</h2>
        {jobs.isLoading ? (
          <p className="muted">Loading…</p>
        ) : jobs.isError ? (
          <p className="error">Could not load jobs.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>User</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {jobs.data!.items.map((j) => (
                <tr key={j.id}>
                  <td>{j.type}</td>
                  <td>{j.status}</td>
                  <td>{j.user.email}</td>
                  <td className="muted small">
                    {new Date(j.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
