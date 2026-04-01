import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "";

export const http = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg =
      err?.response?.data?.error ??
      err?.response?.data?.message ??
      err?.message ??
      "Request failed";
    return Promise.reject(new Error(msg));
  },
);

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

// keep legacy helper for any remaining callers
export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseURL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const msg =
      typeof (errBody as { error?: string }).error === "string"
        ? (errBody as { error: string }).error
        : res.statusText;
    throw new ApiRequestError(msg, res.status, errBody);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
