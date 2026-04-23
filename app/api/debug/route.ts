import { NextResponse } from "next/server";
import { searchBestBuyProducts } from "@/lib/api/bestbuy";
import { withTimeout } from "@/lib/timeout";

export const maxDuration = 15;

export async function GET() {
  const key = process.env.BESTBUY_API_KEY ?? "";

  // ── Test 1: Raw fetch (same URL as the wrapper) ───────────────────────────
  const searchTerm = "HP Omen";
  const SHOW_FIELDS = "sku,name,regularPrice,salePrice,manufacturer,modelNumber,onSale,inStoreAvailability,onlineAvailability,url,image";
  const qs = new URLSearchParams({
    format: "json",
    pageSize: "8",
    show: SHOW_FIELDS,
    apiKey: key,
  });
  const filter = `search=${encodeURIComponent(searchTerm)}%26categoryPath.id=abcat0502000`;
  const url = `https://api.bestbuy.com/v1/products(${filter})?${qs.toString()}`;

  let rawCount = 0;
  let rawStatus = 0;
  let rawError: string | null = null;

  try {
    const r = await fetch(url, { cache: "no-store" });
    rawStatus = r.status;
    const d = await r.json() as { products?: unknown[]; error?: unknown };
    rawCount = (d.products ?? []).length;
    if (d.error) rawError = JSON.stringify(d.error);
  } catch (e) {
    rawError = String(e);
  }

  // ── Test 2: Via withTimeout wrapper ───────────────────────────────────────
  let withTimeoutCount = 0;
  try {
    const r2 = await fetch(url, { cache: "no-store" });
    const d2 = await r2.json() as { products?: unknown[] };
    withTimeoutCount = (d2.products ?? []).length;
  } catch { /* */ }

  const withTimeoutWrapped = await withTimeout(
    fetch(url, { cache: "no-store" }).then(r => r.json()).then((d: { products?: unknown[] }) => (d.products ?? []).length),
    8000,
    -1
  );

  // ── Test 3: Full searchBestBuyProducts call ───────────────────────────────
  const products = await searchBestBuyProducts("HP Omen", 8);

  return NextResponse.json({
    url: url.replace(key, "KEY_HIDDEN"),
    rawFetch: { status: rawStatus, count: rawCount, error: rawError },
    withTimeout: withTimeoutWrapped,
    searchBestBuyProducts: { count: products.length, first: products[0]?.name ?? null },
    env: { bbKeyLength: key.length, bbKeyPreview: key.slice(0, 6) },
  });
}
