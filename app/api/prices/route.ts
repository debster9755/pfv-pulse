import { NextRequest, NextResponse } from "next/server";
import { searchBestBuyProducts } from "@/lib/api/bestbuy";
import { getShoppingPrices } from "@/lib/api/serpapi";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  const [bbResult, serpResult] = await Promise.allSettled([
    searchBestBuyProducts(query, 10),
    getShoppingPrices(query),
  ]);

  return NextResponse.json({
    bestbuy: bbResult.status === "fulfilled" ? bbResult.value : [],
    serp:
      serpResult.status === "fulfilled"
        ? serpResult.value
        : { results: [], low: null, high: null, average: null },
    query,
  });
}
