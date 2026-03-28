import { useAuth } from "../hooks/useAuth.js";
import { Navigate } from "react-router-dom";

export function Admin() {
  const { user } = useAuth();
  if (user?.plan !== "admin") {
    return <Navigate to="/" replace />;
  }
  return (
    <div className="page">
      <h1>Admin</h1>
      <p className="muted">Reserved for a later phase.</p>
    </div>
  );
}
