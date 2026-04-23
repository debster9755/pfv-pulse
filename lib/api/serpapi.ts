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
const FETCH_TIMEOUT_MS = 7000;

function isConfigured(): boolean {
  return Boolean(process.env.SERPAPI_KEY);
}

function parsePrice(raw?: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

export async function getShoppingPrices(query: string): Promise<PriceSummary> {
  const empty: PriceSummary = { results: [], low: null, high: null, average: null };
  if (!isConfigured()) return empty;

  const cacheKey = `serpapi:shopping:${query}`;
  const cached = await cacheGetJson<PriceSummary>(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      engine: "google_shopping",
      q: query,
      api_key: process.env.SERPAPI_KEY!,
      num: "10",
    });
    const res = await fetch(
      `https://serpapi.com/search.json?${params.toString()}`,
      {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        cache: "no-store",
      }
    );
    if (!res.ok) return empty;
    const data: SerpApiResponse = await res.json();
    if (data.error) return empty;

    const results: ShoppingResult[] = (data.shopping_results ?? []).map((r) => ({
      title: r.title,
      price: parsePrice(r.price),
      source: r.source,
      link: r.link ?? null,
      thumbnail: r.thumbnail ?? null,
    }));

    const prices = results.map((r) => r.price).filter((p): p is number => p !== null);
    const summary: PriceSummary = {
      results,
      low: prices.length ? Math.min(...prices) : null,
      high: prices.length ? Math.max(...prices) : null,
      average: prices.length
        ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
        : null,
    };
    await cacheSetJson(cacheKey, summary, CACHE_TTL);
    return summary;
  } catch {
    return empty;
  }
}
