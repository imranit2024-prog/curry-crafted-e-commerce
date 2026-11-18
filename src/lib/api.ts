import { headers } from "next/headers";
import { backendUrl, ensureBackend } from "./backend-process";

/*
 * Server-side client for the FastAPI backend, used by server components.
 * The visitor's cookies are forwarded so the API can identify the session;
 * no business logic or database access happens in the Next.js app.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: Record<string, unknown>,
  ) {
    super(typeof data?.error === "string" ? data.error : `API request failed (${status})`);
  }
}

type Options = { method?: string; body?: unknown; session?: boolean };

export async function apiRequest<T = Record<string, unknown>>(path: string, opts: Options = {}): Promise<{ ok: boolean; status: number; data: T }> {
  const outgoing = new Headers({ accept: "application/json" });
  if (opts.session !== false) {
    const incoming = await headers();
    const cookie = incoming.get("cookie");
    if (cookie) outgoing.set("cookie", cookie);
    const proto = incoming.get("x-forwarded-proto");
    if (proto) outgoing.set("x-forwarded-proto", proto);
    const host = incoming.get("x-forwarded-host") ?? incoming.get("host");
    if (host) outgoing.set("x-forwarded-host", host);
  }
  if (opts.body !== undefined) outgoing.set("content-type", "application/json");

  const send = () =>
    fetch(`${backendUrl()}${path}`, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers: outgoing,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

  let res: Response;
  try {
    res = await send();
  } catch {
    // The API may still be starting (or was restarted): wait for it, then retry once.
    await ensureBackend();
    res = await send();
  }
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

export async function getJson<T>(path: string, opts: Options = {}): Promise<T> {
  const res = await apiRequest<T>(path, opts);
  if (!res.ok) throw new ApiError(res.status, res.data as Record<string, unknown>);
  return res.data;
}
