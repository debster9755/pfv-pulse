import { withTimeout } from "@/lib/timeout";
import { cacheGetJson, cacheSetJson } from "@/lib/redis";

export interface ShoppingResult {
  title: string;
  price: number | null;
  source: string;
  link: string | null;
  thumbnail: string | null;
}

export interface PriceSummary {
  results: ShoppingResult[];
  low: number | null;
  high: number | null;
  average: number | null;
}

interface SerpApiShoppingResult {
  title: string;
  price?: string;
  source: string;
  link?: string;
  thumbnail?: string;
}

interface SerpApiResponse {
  shopping_results?: SerpApiShoppingResult[];
  error?: string;
}

const CACHE_TTL = 3600;
const API_TIMEOUT_MS = 8000;
const EMPTY: PriceSummary = { results: [], low: null, high: null, average: null };

function isConfigured(): boolean {
  return Boolean(process.env.SERPAPI_KEY);
}

function parsePrice(raw?: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

async function fetchFromApi(query: string): Promise<PriceSummary> {
  const params = new URLSearchParams({
    engine: "google_shopping",
    q: query,
    api_key: process.env.SERPAPI_KEY!,
    num: "10",
    gl: "us",
    hl: "en",
  });
  const res = await fetch(
    `https://serpapi.com/search.json?${params.toString()}`,
    { cache: "no-store" }
  );
  if (!res.ok) return EMPTY;
  const data: SerpApiResponse = await res.json();
  if (data.error) return EMPTY;

  const results: ShoppingResult[] = (data.shopping_results ?? []).map((r) => ({
    title: r.title,
    price: parsePrice(r.price),
    source: r.source,
    link: r.link ?? null,
    thumbnail: r.thumbnail ?? null,
  }));
  const prices = results.map((r) => r.price).filter((p): p is number => p !== null);
  return {
    results,
    low: prices.length ? Math.min(...prices) : null,
    high: prices.length ? Math.max(...prices) : null,
    average: prices.length
      ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
      : null,
  };
}

export async function getShoppingPrices(query: string): Promise<PriceSummary> {
  if (!isConfigured()) return EMPTY;

  // Check cache first — non-blocking 800ms max
  const cacheKey = `serpapi:v4:${query}`;
  try {
    const cached = await withTimeout(
      cacheGetJson<PriceSummary>(cacheKey),
      800,
      null
    );
    if (cached && cached.results.length > 0) return cached;
  } catch {
    // proceed to live fetch
  }

  // Live API fetch with hard timeout
  const result = await withTimeout(fetchFromApi(query), API_TIMEOUT_MS, EMPTY);

  if (result.results.length > 0) {
    cacheSetJson(cacheKey, result, CACHE_TTL).catch(() => {});
  }
  return result;
}
