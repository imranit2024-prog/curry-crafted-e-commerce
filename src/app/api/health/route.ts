import { db } from "@/db";
import { backendStatus } from "@/lib/backend-process";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Health of the whole storefront: the database must be reachable and the
 * FastAPI backend must be up (or still starting, straight after a boot).
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
  } catch {
    return Response.json({ ok: false, database: "down" }, { status: 500 });
  }
  const api = await backendStatus();
  return Response.json({ ok: api !== "down", database: "up", api }, { status: api === "down" ? 503 : 200 });
}
