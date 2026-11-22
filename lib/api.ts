'use client';

/** Thrown for non-2xx responses; `message` is safe to show to users. */
export class ApiClientError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: json !== undefined ? { 'Content-Type': 'application/json', ...(rest.headers || {}) } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      credentials: 'same-origin',
      cache: 'no-store'
    });
  } catch {
    throw new ApiClientError(0, 'Could not reach the store server. Check your internet connection — if it is fine, the server may be restarting or down; try again in a moment.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiClientError(res.status, (data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

/** Admin API helper: a 401 means the session expired, so reload to show the login screen. */
export async function adminFetch<T>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  try {
    return await apiFetch<T>(url, init);
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 401 && typeof window !== 'undefined') {
      window.location.reload();
    }
    throw err;
  }
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.';
}
