import { cacheGetJson, cacheSetJson } from "@/lib/redis";

export interface ReviewEntry {
  source: string;
  title: string;
  rating: number | null;
  url: string | null;
  scrapedAt: string;
}

const SCRAPER_BASE = process.env.SCRAPER_SERVICE_URL ?? "";

export async function fetchAggregatedReviews(
  productName: string
): Promise<ReviewEntry[]> {
  if (!SCRAPER_BASE) return [];

  const cacheKey = `reviews:${productName}`;
  const cached = await cacheGetJson<ReviewEntry[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${SCRAPER_BASE}/scrape/reviews?product=${encodeURIComponent(productName)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];
    const data: ReviewEntry[] = await res.json();
    await cacheSetJson(cacheKey, data, 3600);
    return data;
  } catch {
    return [];
  }
}
