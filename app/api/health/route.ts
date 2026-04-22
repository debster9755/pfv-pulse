export async function GET() {
  const checks: Record<string, string> = {};

  // Prisma check
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch (e) {
    checks.database = `error: ${(e as Error).message}`;
  }

  // Redis check
  try {
    const { redis } = await import("@/lib/redis");
    await redis.ping();
    checks.redis = "ok";
  } catch (e) {
    checks.redis = `error: ${(e as Error).message}`;
  }

  checks.env_database = process.env.DATABASE_URL ? "set" : "missing";
  checks.env_redis = process.env.REDIS_URL ? "set" : "missing";
  checks.env_bestbuy = process.env.BESTBUY_KEY ? "set" : "missing";

  const allOk = checks.database === "ok" && checks.redis === "ok";
  return Response.json({ status: allOk ? "ok" : "degraded", checks }, { status: allOk ? 200 : 500 });
}
