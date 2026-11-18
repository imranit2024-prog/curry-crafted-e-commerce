import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsDrizzle?: NodePgDatabase;
};

function getPool() {
  if (globalForDb.__arenaNextJsPostgresqlPool) {
    return globalForDb.__arenaNextJsPostgresqlPool;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }
  return pool;
}

function getDb() {
  if (globalForDb.__arenaNextJsDrizzle) {
    return globalForDb.__arenaNextJsDrizzle;
  }

  const instance = drizzle(getPool());
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsDrizzle = instance;
  }
  return instance;
}

/** Lazy DB client — avoids requiring DATABASE_URL during `next build`. */
export const db = new Proxy({} as NodePgDatabase, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export const pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    const instance = getPool();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
