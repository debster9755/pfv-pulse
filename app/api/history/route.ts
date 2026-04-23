import { NextRequest, NextResponse } from "next/server";
import { getKeepaHistory } from "@/lib/api/keepa";
import { getShoppingPrices } from "@/lib/api/serpapi";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  const asin = req.nextUrl.searchParams.get("asin");

  if (!query && !asin) {
    return NextResponse.json({ error: "q or asin is required" }, { status: 400 });
  }

  const [keepaResult, serpResult] = await Promise.allSettled([
    asin ? getKeepaHistory(asin) : Promise.resolve(null),
    query ? getShoppingPrices(query) : Promise.resolve(null),
  ]);

  const keepaData = keepaResult.status === "fulfilled" ? keepaResult.value : null;
  const serpData = serpResult.status === "fulfilled" ? serpResult.value : null;

  // Pull DB price history if available
  let dbHistory: { date: string; price: number; retailer: string }[] = [];
  try {
    const prices = await prisma.price.findMany({
      where: {
        product: query
          ? { name: { contains: query, mode: "insensitive" } }
          : {},
        recordedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { recordedAt: "asc" },
      select: { price: true, retailer: true, recordedAt: true },
    });
    dbHistory = prices.map((p: { price: number; retailer: string; recordedAt: Date }) => ({
      date: p.recordedAt.toISOString().split("T")[0],
      price: p.price,
      retailer: p.retailer,
    }));
  } catch {
    // DB not available — continue with API data only
  }

  return NextResponse.json({
    keepa: keepaData,
    serp: serpData,
    dbHistory,
    hasData: Boolean(keepaData || serpData || dbHistory.length),
  });
}
