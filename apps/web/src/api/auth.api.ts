import { apiJson } from "./http.js";

export type AuthUser = {
  id: string;
  email: string;
  plan: string;
};

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/auth/me`, {
    credentials: "include",
  });
  if (res.status === 401) {
    return null;
  }
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<AuthUser>;
}

export function login(email: string, password: string) {
  return apiJson<AuthUser>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(email: string, password: string) {
  return apiJson<AuthUser>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return apiJson<void>("/api/auth/logout", { method: "POST" });
}
