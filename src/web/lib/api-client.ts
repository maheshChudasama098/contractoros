import type { ApiData, ApiError } from "@shared/contracts/api";

export class ApiClientError extends Error {
  constructor(public readonly status: number, public readonly body: ApiError["error"]) {
    super(body.message);
  }
}

// Browser-side fetch wrapper for /api/v1. Cookies carry the session.
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
    credentials: "same-origin",
  });
  const json = await res.json();
  if (!res.ok) throw new ApiClientError(res.status, (json as ApiError).error);
  return (json as ApiData<T>).data;
}
