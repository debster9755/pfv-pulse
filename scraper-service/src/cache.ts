import { createClient } from "redis";

const client = createClient({ url: process.env.REDIS_URL ?? "redis://localhost:6379" });
client.on("error", (e) => console.error("[Redis]", e.message));
client.connect().catch(() => {});

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const val = await client.get(key);
    return val ? (JSON.parse(val) as T) : null;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttl = 3600): Promise<void> {
  try {
    await client.set(key, JSON.stringify(value), { EX: ttl });
  } catch {
    // non-fatal
  }
}
