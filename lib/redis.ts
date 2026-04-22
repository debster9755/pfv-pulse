import { createClient } from "redis";

const globalForRedis = globalThis as unknown as {
  redis: ReturnType<typeof createClient>;
};

function createRedisClient() {
  const client = createClient({
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
  });

  client.on("error", (err) => {
    if (process.env.NODE_ENV !== "test") {
      console.error("[Redis] Connection error:", err.message);
    }
  });

  client.connect().catch((err) => {
    console.error("[Redis] Failed to connect:", err.message);
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const val = await redis.get(key);
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
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch {
    // non-fatal — cache miss is acceptable
  }
}

export async function invalidate(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    // ignore
  }
}
