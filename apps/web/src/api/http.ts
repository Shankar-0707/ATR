const baseUrl = () => import.meta.env.VITE_API_URL ?? "";

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

export async function apiJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
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
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
