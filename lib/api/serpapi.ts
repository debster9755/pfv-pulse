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

function isConfigured(): boolean {
  return Boolean(process.env.SERPAPI_KEY);
}

function parsePrice(raw?: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastCallAt = 0;
const RATE_LIMIT_MS = 1200;

async function throttledFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = RATE_LIMIT_MS - (now - lastCallAt);
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
  return fetch(url, { next: { revalidate: 0 } });
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
      num: "20",
    });
    const res = await throttledFetch(
      `https://serpapi.com/search.json?${params.toString()}`
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
