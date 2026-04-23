import axios from "axios";
import { getCached, setCached } from "@/lib/redis";
import { keepaThrottle } from "@/lib/utils/throttle";

const BASE = "https://api.keepa.com";
const CACHE_TTL = 6 * 60 * 60; // 6 hours

// Keepa timestamps are minutes since 2011-01-01T00:00:00Z
const KEEPA_EPOCH = new Date("2011-01-01T00:00:00Z").getTime();

export interface PricePoint {
  date: string; // ISO
  price: number; // USD
}

export interface KeepaHistory {
  asin: string;
  title: string;
  amazonPrice: PricePoint[];
  newPrice: PricePoint[];
  current: number;
  thirtyDayLow: number;
  thirtyDayHigh: number;
  thirtyDayAvg: number;
  fetchedAt: string;
}

function keepaTimeToISO(keepaMinutes: number): string {
  return new Date(KEEPA_EPOCH + keepaMinutes * 60 * 1000).toISOString();
}

function decodePriceSeries(csv: number[]): PricePoint[] {
  const points: PricePoint[] = [];
  for (let i = 0; i < csv.length - 1; i += 2) {
    const ts = csv[i];
    const raw = csv[i + 1];
    if (ts < 0 || raw < 0) continue;
    points.push({ date: keepaTimeToISO(ts), price: raw / 100 });
  }
  return points;
}

function last30Days(series: PricePoint[]): PricePoint[] {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return series.filter((p) => new Date(p.date).getTime() >= cutoff);
}

async function fetchKeepaProduct(asin: string): Promise<KeepaHistory> {
  const res = await axios.get(`${BASE}/product`, {
    params: {
      key: process.env.KEEPA_KEY,
      domain: 1, // amazon.com
      asin,
      history: 1,
      days: 30,
    },
    timeout: 20000,
  });

  const product = res.data.products?.[0];
  if (!product) throw new Error(`Keepa: no product found for ASIN ${asin}`);

  const csvData = product.csv ?? [];
  const amazonSeries = csvData[0] ? decodePriceSeries(csvData[0]) : [];
  const newSeries = csvData[1] ? decodePriceSeries(csvData[1]) : [];

  const recent = last30Days(newSeries.length ? newSeries : amazonSeries);
  const prices = recent.map((p) => p.price).filter((p) => p > 0);

  return {
    asin,
    title: product.title ?? "",
    amazonPrice: last30Days(amazonSeries),
    newPrice: last30Days(newSeries),
    current: prices.at(-1) ?? 0,
    thirtyDayLow: prices.length ? Math.min(...prices) : 0,
    thirtyDayHigh: prices.length ? Math.max(...prices) : 0,
    thirtyDayAvg: prices.length
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : 0,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getAmazonPriceHistory(
  asin: string
): Promise<KeepaHistory> {
  const cacheKey = `keepa:history:${asin}`;
  const cached = await getCached<KeepaHistory>(cacheKey);
  if (cached) return cached;

  const data = await keepaThrottle.call(() => fetchKeepaProduct(asin));
  await setCached(cacheKey, data, CACHE_TTL);
  return data;
}

// Batch lookup up to 20 ASINs per call (Keepa supports it)
export async function getAmazonPriceHistoryBatch(
  asins: string[]
): Promise<KeepaHistory[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < asins.length; i += 20) {
    chunks.push(asins.slice(i, i + 20));
  }

  const results: KeepaHistory[] = [];
  for (const chunk of chunks) {
    const fetched = await keepaThrottle.call(async () => {
      const res = await axios.get(`${BASE}/product`, {
        params: {
          key: process.env.KEEPA_KEY,
          domain: 1,
          asin: chunk.join(","),
          history: 1,
          days: 30,
        },
        timeout: 30000,
      });
      return (res.data.products ?? []).map((product: Record<string, unknown>) => {
        const csvData = (product.csv as number[][] | null) ?? [];
        const amazonSeries = csvData[0] ? decodePriceSeries(csvData[0]) : [];
        const newSeries = csvData[1] ? decodePriceSeries(csvData[1]) : [];
        const recent = last30Days(newSeries.length ? newSeries : amazonSeries);
        const prices = recent.map((p) => p.price).filter((p) => p > 0);
        return {
          asin: product.asin as string,
          title: (product.title as string) ?? "",
          amazonPrice: last30Days(amazonSeries),
          newPrice: last30Days(newSeries),
          current: prices.at(-1) ?? 0,
          thirtyDayLow: prices.length ? Math.min(...prices) : 0,
          thirtyDayHigh: prices.length ? Math.max(...prices) : 0,
          thirtyDayAvg: prices.length
            ? prices.reduce((a, b) => a + b, 0) / prices.length
            : 0,
          fetchedAt: new Date().toISOString(),
        } as KeepaHistory;
      });
    });
    results.push(...fetched);
  }
  return results;
}
