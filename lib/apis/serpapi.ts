import axios from "axios";
import { getCached, setCached } from "@/lib/redis";
import { serpThrottle } from "@/lib/utils/throttle";

const BASE = "https://serpapi.com/search";
const CACHE_TTL = 60 * 60; // 1 hour

export interface ShoppingResult {
  title: string;
  price: number;
  currency: string;
  retailer: string;
  link: string;
  inStock: boolean;
  thumbnail?: string;
}

export interface SerpPriceSummary {
  low: number;
  high: number;
  average: number;
  results: ShoppingResult[];
  fetchedAt: string;
}

function parsePrice(raw: string | number | undefined): number {
  if (typeof raw === "number") return raw;
  if (!raw) return 0;
  return parseFloat(String(raw).replace(/[^0-9.]/g, "")) || 0;
}

async function fetchGoogleShopping(query: string): Promise<ShoppingResult[]> {
  const res = await axios.get(BASE, {
    params: {
      engine: "google_shopping",
      q: query,
      api_key: process.env.SERPAPI_KEY,
      num: 20,
      gl: "us",
      hl: "en",
    },
    timeout: 15000,
  });

  const items: ShoppingResult[] = (res.data.shopping_results ?? []).map(
    (r: Record<string, unknown>) => ({
      title: String(r.title ?? ""),
      price: parsePrice(r.price as string | number),
      currency: "USD",
      retailer: String(r.source ?? ""),
      link: String(r.link ?? ""),
      inStock: r.in_stock !== false,
      thumbnail: r.thumbnail ? String(r.thumbnail) : undefined,
    })
  );

  return items.filter((i) => i.price > 0);
}

export async function getShoppingPrices(
  productName: string
): Promise<SerpPriceSummary> {
  const cacheKey = `serp:shopping:${productName.toLowerCase().replace(/\s+/g, "-")}`;
  const cached = await getCached<SerpPriceSummary>(cacheKey);
  if (cached) return cached;

  const results = await serpThrottle.call(() =>
    fetchGoogleShopping(productName)
  );

  if (results.length === 0) {
    return {
      low: 0,
      high: 0,
      average: 0,
      results: [],
      fetchedAt: new Date().toISOString(),
    };
  }

  const prices = results.map((r) => r.price);
  const summary: SerpPriceSummary = {
    low: Math.min(...prices),
    high: Math.max(...prices),
    average: prices.reduce((a, b) => a + b, 0) / prices.length,
    results,
    fetchedAt: new Date().toISOString(),
  };

  await setCached(cacheKey, summary, CACHE_TTL);
  return summary;
}
