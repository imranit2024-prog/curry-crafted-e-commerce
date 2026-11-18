import { execFile, spawn, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";

/*
 * Where the FastAPI backend lives.
 *
 * - BACKEND_URL set:   the API is its own service (production). Nothing is started here.
 * - BACKEND_URL unset: this Next.js server starts the API from ./backend as a child
 *                      process on 127.0.0.1:BACKEND_PORT, installing its Python
 *                      dependencies into backend/.pydeps on first run. This keeps the
 *                      preview a single deployable unit.
 */

const PORT = process.env.BACKEND_PORT ?? "8421";
export const BACKEND_IS_EXTERNAL = Boolean(process.env.BACKEND_URL);

export function backendUrl(): string {
  return (process.env.BACKEND_URL ?? `http://127.0.0.1:${PORT}`).replace(/\/$/, "");
}

type State = { child?: ChildProcess; starting?: Promise<void> };
const g = globalThis as typeof globalThis & { __ccBackend?: State };
const state = (): State => (g.__ccBackend ??= {});

const backendDir = () => path.join(/* turbopackIgnore: true */ process.cwd(), "backend");
const pidFile = () => path.join(backendDir(), ".uvicorn.pid");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function run(cmd: string, args: string[], opts: { cwd?: string; env?: NodeJS.ProcessEnv; timeout?: number } = {}): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    execFile(/* turbopackIgnore: true */ cmd, args, { cwd: opts.cwd, env: opts.env ?? process.env, timeout: opts.timeout ?? 20000, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) =>
      resolve({ ok: !err, output: `${stdout}${stderr}` }),
    );
  });
}

async function healthy(timeoutMs = 1500): Promise<boolean> {
  try {
    const res = await fetch(`${backendUrl()}/api/health`, { signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function backendStatus(): Promise<"up" | "starting" | "down"> {
  if (await healthy()) return "up";
  return !BACKEND_IS_EXTERNAL && state().starting ? "starting" : "down";
}

/** Finds a Python that can import the backend's dependencies, installing them project-locally if needed. */
async function pythonRuntime(): Promise<{ python: string; env: NodeJS.ProcessEnv }> {
  const dir = backendDir();
  const deps = path.join(dir, ".pydeps");
  const python = process.env.BACKEND_PYTHON ?? "python3";
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PYTHONPATH: [deps, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
    PYTHONUNBUFFERED: "1",
  };
  const probe = ["-c", "import fastapi, uvicorn, psycopg, psycopg_pool"];
  if ((await run(python, probe, { env })).ok) return { python, env };

  console.log("[api] Installing Python dependencies into backend/.pydeps (first run)…");
  const install = (extra: string[]) =>
    run(python, ["-m", "pip", "install", "--quiet", "--disable-pip-version-check", ...extra, "--target", deps, "-r", "requirements.txt"], { cwd: dir, timeout: 300000 });
  let result = await install(["--break-system-packages"]);
  if (!result.ok && /no such option/i.test(result.output)) result = await install([]);
  if (!(await run(python, probe, { env })).ok) {
    throw new Error(`Could not prepare the Python environment for the FastAPI backend (is python3 with pip installed?). ${result.output.slice(-500)}`);
  }
  return { python, env };
}

/** Stops a backend left behind by a previous server run, so a restart always serves the current code. */
async function stopStale(): Promise<void> {
  let pid = 0;
  try {
    pid = Number(fs.readFileSync(pidFile(), "utf8").trim());
  } catch {
    return;
  }
  if (!pid || pid === state().child?.pid) return;
  try {
    // Only ever signal a process that is verifiably our uvicorn (guards against a recycled pid).
    const cmdline = fs.readFileSync(`/proc/${pid}/cmdline`, "utf8");
    if (!cmdline.includes("uvicorn") || !cmdline.includes("app.main:app")) return;
    process.kill(pid, "SIGTERM");
    for (let i = 0; i < 20 && fs.existsSync(`/proc/${pid}`); i++) await sleep(150);
  } catch {
    /* already gone */
  }
}

async function start(): Promise<void> {
  const s = state();
  if (await healthy()) return; // already running: ours, or one a developer started by hand

  const { python, env } = await pythonRuntime();
  const child = spawn(/* turbopackIgnore: true */ python, ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", PORT, "--no-access-log"], {
    cwd: backendDir(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  s.child = child;
  try {
    if (child.pid) fs.writeFileSync(pidFile(), String(child.pid));
  } catch {
    /* read-only filesystem: stale-process cleanup is simply skipped next time */
  }
  const relay = (chunk: Buffer) => {
    for (const line of chunk.toString().split("\n")) if (line.trim()) console.log(`[api] ${line}`);
  };
  child.stdout?.on("data", relay);
  child.stderr?.on("data", relay);
  child.on("exit", (code) => {
    if (s.child === child) {
      console.error(`[api] FastAPI process exited with code ${code}`);
      s.child = undefined;
      s.starting = undefined; // the next request will start it again
    }
  });
  process.once("exit", () => child.kill());

  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (await healthy(1000)) return;
    if (child.exitCode !== null) {
      if (await healthy(1000)) return; // another worker won the race for the port
      throw new Error("The FastAPI backend exited during startup. See the [api] log lines above.");
    }
    await sleep(250);
  }
  throw new Error("The FastAPI backend did not become healthy within 60 seconds.");
}

/** Resolves once the backend is reachable. Safe to call from every request: concurrent callers share one start. */
export function ensureBackend(): Promise<void> {
  if (BACKEND_IS_EXTERNAL) return Promise.resolve();
  const s = state();
  if (!s.starting) {
    s.starting = start().catch((err) => {
      s.starting = undefined;
      throw err;
    });
  }
  return s.starting;
}

/**
 * Called once when the Next.js server boots (see src/instrumentation.ts).
 * The start is registered before any awaiting, so the health check reports
 * "starting" rather than "down" from the first instant.
 */
export function bootBackend(): Promise<void> {
  if (BACKEND_IS_EXTERNAL) return Promise.resolve();
  const s = state();
  if (!s.starting) {
    s.starting = (async () => {
      await stopStale();
      await start();
    })().catch((err) => {
      s.starting = undefined;
      throw err;
    });
  }
  return s.starting;
}
