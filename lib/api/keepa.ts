import { cacheGetJson, cacheSetJson } from "@/lib/redis";

export interface KeepaDataPoint {
  date: string;
  price: number;
}

export interface KeepaHistory {
  asin: string;
  history: KeepaDataPoint[];
  currentPrice: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
}

interface KeepaProduct {
  asin: string;
  csv?: (number | null)[][];
}

interface KeepaApiResponse {
  products?: KeepaProduct[];
}

const CACHE_TTL = 7200;
const KEEPA_EPOCH_OFFSET = 21564000;

function keepaTimeToDate(keepaTime: number): string {
  const unixMinutes = (keepaTime + KEEPA_EPOCH_OFFSET) * 60;
  return new Date(unixMinutes * 1000).toISOString().split("T")[0];
}

function isConfigured(): boolean {
  return Boolean(process.env.KEEPA_API_KEY);
}

let lastKeepaCallAt = 0;
const KEEPA_RATE_LIMIT_MS = 2000;

async function throttledFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = KEEPA_RATE_LIMIT_MS - (now - lastKeepaCallAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastKeepaCallAt = Date.now();
  return fetch(url, { next: { revalidate: 0 } });
}

export async function getKeepaHistory(asin: string): Promise<KeepaHistory | null> {
  if (!isConfigured()) return null;

  const cacheKey = `keepa:history:${asin}`;
  const cached = await cacheGetJson<KeepaHistory>(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      key: process.env.KEEPA_API_KEY!,
      domain: "1",
      asin,
      stats: "30",
      history: "1",
    });
    const res = await throttledFetch(
      `https://api.keepa.com/product?${params.toString()}`
    );
    if (!res.ok) return null;
    const data: KeepaApiResponse = await res.json();
    const product = data.products?.[0];
    if (!product) return null;

    const amazonPriceCsv = product.csv?.[0] ?? [];
    const history: KeepaDataPoint[] = [];
    for (let i = 0; i < amazonPriceCsv.length - 1; i += 2) {
      const keepaTime = amazonPriceCsv[i];
      const rawPrice = amazonPriceCsv[i + 1];
      if (keepaTime == null || rawPrice == null || rawPrice < 0) continue;
      history.push({
        date: keepaTimeToDate(keepaTime),
        price: rawPrice / 100,
      });
    }

    const prices = history.map((h) => h.price);
    const result: KeepaHistory = {
      asin,
      history: history.slice(-30),
      currentPrice: prices.length ? prices[prices.length - 1] : null,
      lowestPrice: prices.length ? Math.min(...prices) : null,
      highestPrice: prices.length ? Math.max(...prices) : null,
    };
    await cacheSetJson(cacheKey, result, CACHE_TTL);
    return result;
  } catch {
    return null;
  }
}
