import { createClient } from "redis";

let client: ReturnType<typeof createClient> | null = null;

function getRedisUrl(): string | null {
  // Support both variable names (prior deployment used REDIS_URL)
  return process.env.UPSTASH_REDIS_URL ?? process.env.REDIS_URL ?? null;
}

async function getRedisClient() {
  const url = getRedisUrl();
  if (!url) return null;
  if (!client) {
    client = createClient({ url, socket: { connectTimeout: 3000 } });
    client.on("error", () => {
      client = null;
    });
    try {
      await client.connect();
    } catch {
      client = null;
    }
  }
  return client;
}

export async function cacheGet(key: string): Promise<string | null> {
  try {
    const redis = await getRedisClient();
    if (!redis) return null;
    return await redis.get(key);
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
    await redis.set(key, value, { EX: ttlSeconds });
  } catch {
    // cache unavailable is non-fatal
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
