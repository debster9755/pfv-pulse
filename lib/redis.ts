import { createClient } from "redis";
import { withTimeout } from "./timeout";

const CONNECT_TIMEOUT_MS = 1500;
const OP_TIMEOUT_MS = 800;

let client: ReturnType<typeof createClient> | null = null;
let connecting = false;

function getRedisUrl(): string | null {
  return process.env.UPSTASH_REDIS_URL ?? process.env.REDIS_URL ?? null;
}

async function getRedisClient() {
  const url = getRedisUrl();
  if (!url) return null;
  if (client?.isReady) return client;
  if (connecting) return null; // don't stack connections in cold-start

  connecting = true;
  try {
    const c = createClient({ url, socket: { connectTimeout: CONNECT_TIMEOUT_MS } });
    c.on("error", () => { client = null; connecting = false; });

    const connected = await withTimeout(c.connect(), CONNECT_TIMEOUT_MS, false as unknown as typeof c);
    // withTimeout resolves false on timeout — check if we got a real client back
    if (connected && typeof (connected as typeof c).get === "function") {
      client = connected as typeof c;
      connecting = false;
      return client;
    }
    connecting = false;
    return null;
  } catch {
    connecting = false;
    return null;
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  try {
    const redis = await getRedisClient();
    if (!redis) return null;
    return await withTimeout(redis.get(key), OP_TIMEOUT_MS, null);
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds = 3600
): Promise<void> {
  try {
    const redis = await getRedisClient();
    if (!redis) return;
    await withTimeout(redis.set(key, value, { EX: ttlSeconds }), OP_TIMEOUT_MS, null);
  } catch {
    // non-fatal
  }
}

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const raw = await cacheGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSetJson(
  key: string,
  value: unknown,
  ttlSeconds = 3600
): Promise<void> {
  await cacheSet(key, JSON.stringify(value), ttlSeconds);
}
