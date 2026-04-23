import { NextRequest, NextResponse } from "next/server";
import { getShoppingPrices } from "@/lib/api/serpapi";

export async function GET(req: NextRequest) {
  const brandsParam = req.nextUrl.searchParams.get("brands");
  if (!brandsParam) {
    return NextResponse.json({ error: "brands is required (comma-separated)" }, { status: 400 });
  }

  const brands = brandsParam.split(",").map((b) => b.trim()).filter(Boolean);
  if (brands.length < 2) {
    return NextResponse.json({ error: "At least 2 brands required for comparison" }, { status: 400 });
  }

  const results = await Promise.allSettled(brands.map((b) => getShoppingPrices(b)));

  const rows = brands.map((brand, i) => {
    const summary =
      results[i].status === "fulfilled"
        ? results[i].value
        : { average: null, low: null, high: null, results: [] };
    return { brand, ...summary };
  });

  const hpRow = rows.find((r) => /\bhp\b/i.test(r.brand));
  const hpAvg = hpRow?.average ?? null;

  const table = rows.map((r) => ({
    brand: r.brand,
    average: r.average,
    low: r.low,
    high: r.high,
    priceDeltaVsHp:
      hpAvg != null && r.average != null && r.brand !== hpRow?.brand
        ? Math.round(((r.average - hpAvg) / hpAvg) * 10000) / 100
        : null,
  }));

  return NextResponse.json({ table, hpBaseline: hpAvg });
}
