/**
 * Runs once when the Next.js server starts. When no external BACKEND_URL is
 * configured, it boots the FastAPI backend from ./backend so the storefront and
 * its API come up together. The boot is not awaited, so the web server is ready
 * immediately; early requests wait for the API inside the API client instead.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { bootBackend } = await import("./lib/backend-process");
  void bootBackend().catch((err: unknown) => console.error(`[api] ${err instanceof Error ? err.message : String(err)}`));
}
