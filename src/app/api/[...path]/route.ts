import { backendUrl, ensureBackend } from "@/lib/backend-process";

export const dynamic = "force-dynamic";

/*
 * Transparent proxy: every /api/* request from the browser is forwarded to the
 * FastAPI backend, and its response (including Set-Cookie) is passed straight
 * back. Keeping the API same-origin means cookies work without CORS and the
 * backend address is never exposed to the browser.
 */

const FORWARDED = ["content-type", "cookie", "accept", "accept-language", "user-agent", "stripe-signature"];

async function proxy(req: Request, ctx: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await ctx.params;
  const url = new URL(req.url);
  const target = `${backendUrl()}/api/${path.map(encodeURIComponent).join("/")}${url.search}`;

  const headers = new Headers();
  for (const name of FORWARDED) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("x-forwarded-host", req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host);
  headers.set("x-forwarded-proto", (req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")).split(",")[0].trim());

  // The raw bytes are forwarded untouched (the Stripe webhook signature is computed over them).
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  const send = () => fetch(target, { method: req.method, headers, body, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(30000) });

  let res: Response;
  try {
    res = await send();
  } catch {
    try {
      await ensureBackend(); // the API may still be starting
      res = await send();
    } catch (err) {
      console.error("[api] proxy failed", err);
      return Response.json({ error: "Our ordering service is temporarily unavailable. Please try again in a moment." }, { status: 502 });
    }
  }

  const out = new Headers({ "cache-control": "no-store" });
  const type = res.headers.get("content-type");
  if (type) out.set("content-type", type);
  for (const cookie of res.headers.getSetCookie()) out.append("set-cookie", cookie);
  return new Response(res.body, { status: res.status, headers: out });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
