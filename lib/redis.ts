import { createClient, type RedisClientType } from "redis";

declare global {
  // eslint-disable-next-line no-var
  var _redisClient: RedisClientType | undefined;
}

function buildClient(): RedisClientType {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const client = createClient({ url }) as RedisClientType;
  client.on("error", (err: Error) => {
    if (process.env.NODE_ENV !== "test") {
      console.error("[Redis] error:", err.message);
    }
  });
  return client;
}

async function getClient(): Promise<RedisClientType> {
  if (!globalThis._redisClient) {
    globalThis._redisClient = buildClient();
  }
  if (!globalThis._redisClient.isOpen) {
    await globalThis._redisClient.connect();
  }
  return globalThis._redisClient;
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const client = await getClient();
    const val = await client.get(key);
    return val ? (JSON.parse(val) as T) : null;
  } catch {
    return null;
  }
}

export async function setCached(
  key: string,
  value: unknown,
  ttlSeconds = 3600
): Promise<void> {
  try {
    const client = await getClient();
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch {
    // non-fatal
  }
}

export async function invalidate(key: string): Promise<void> {
  try {
    const client = await getClient();
    await client.del(key);
  } catch {
    // ignore
  }
}

// For the health check
export const redis = { ping: async () => { const c = await getClient(); return c.ping(); } };
