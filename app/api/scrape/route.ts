import { NextRequest, NextResponse } from "next/server";

const SCRAPER_BASE = process.env.SCRAPER_SERVICE_URL ?? "";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "prices";
  const query = req.nextUrl.searchParams.get("q") ?? req.nextUrl.searchParams.get("product") ?? "";

  if (!SCRAPER_BASE) {
    return NextResponse.json({ error: "Scraper service not configured", data: null }, { status: 503 });
  }

  if (!query) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  try {
    const endpoint = type === "benchmarks" ? "benchmarks" : type === "reviews" ? "reviews" : "prices";
    const paramKey = endpoint === "prices" ? "q" : "product";
    const url = `${SCRAPER_BASE}/scrape/${endpoint}?${paramKey}=${encodeURIComponent(query)}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
    if (!res.ok) {
      return NextResponse.json({ error: "Scraper returned error", data: null }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({ data, source: "scraper" });
  } catch {
    return NextResponse.json({ error: "Scraper unavailable", data: null }, { status: 503 });
  }
}
