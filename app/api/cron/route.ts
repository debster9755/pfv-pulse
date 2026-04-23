import { NextRequest } from "next/server";
import axios from "axios";
import { prisma } from "@/lib/prisma";

// Vercel Cron: secured with CRON_SECRET env var
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    select: { id: true, name: true },
    orderBy: { updatedAt: "asc" },
    take: 10, // process up to 10 per cron tick (Vercel 60s limit)
  });

  const scraperUrl = process.env.SCRAPER_SERVICE_URL ?? "http://localhost:3001";
  const scraperKey = process.env.SCRAPER_INTERNAL_KEY ?? "changeme";

  const results = await Promise.allSettled(
    products.map((p: { id: string; name: string }) =>
      axios.post(
        `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/scrape`,
        { productId: p.id, type: "full" },
        { headers: { "x-internal-key": scraperKey } }
      )
    )
  );

  const succeeded = results.filter((r: PromiseSettledResult<unknown>) => r.status === "fulfilled").length;
  const failed = results.filter((r: PromiseSettledResult<unknown>) => r.status === "rejected").length;

  await prisma.cronLog.create({
    data: {
      jobName: "scrape-refresh",
      status: failed === 0 ? "success" : "partial",
      details: { total: products.length, succeeded, failed },
    },
  });

  return Response.json({ ok: true, total: products.length, succeeded, failed });
}
