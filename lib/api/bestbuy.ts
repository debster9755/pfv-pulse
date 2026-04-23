import { cacheGetJson, cacheSetJson } from "@/lib/redis";
import { withTimeout } from "@/lib/timeout";

export interface BestBuyProduct {
  sku: string;
  name: string;
  regularPrice: number | null;
  salePrice: number | null;
  onSale: boolean;
  inStoreAvailability: boolean;
  onlineAvailability: boolean;
  url: string | null;
  image: string | null;
  brand: string;
  modelNumber: string;
}

interface BestBuyApiProduct {
  sku: string;
  name: string;
  regularPrice: number;
  salePrice: number;
  onSale: boolean;
  inStoreAvailability: boolean;
  onlineAvailability: boolean;
  url: string;
  image: string;
  manufacturer: string;
  modelNumber: string;
}

interface BestBuyApiResponse {
  products?: BestBuyApiProduct[];
  error?: { message: string };
}

const BASE_URL = "https://api.bestbuy.com/v1";
const CACHE_TTL = 1800;
const API_TIMEOUT_MS = 8000;
const LAPTOP_CATEGORY_ID = "abcat0502000";
const SHOW_FIELDS =
  "sku,name,regularPrice,salePrice,manufacturer,modelNumber,onSale,inStoreAvailability,onlineAvailability,url,image";

function isConfigured(): boolean {
  return Boolean(process.env.BESTBUY_API_KEY);
}

function mapProduct(p: BestBuyApiProduct): BestBuyProduct {
  return {
    sku: p.sku,
    name: p.name,
    regularPrice: p.regularPrice ?? null,
    salePrice: p.salePrice ?? null,
    onSale: p.onSale,
    inStoreAvailability: p.inStoreAvailability,
    onlineAvailability: p.onlineAvailability,
    url: p.url ?? null,
    image: p.image ?? null,
    brand: p.manufacturer ?? "",
    modelNumber: p.modelNumber ?? "",
  };
}

async function fetchFromApi(query: string, pageSize: number): Promise<BestBuyProduct[]> {
  const searchTerm = query.replace(/[()]/g, "").trim();
  const qs = new URLSearchParams({
    format: "json",
    pageSize: String(pageSize),
    show: SHOW_FIELDS,
    apiKey: process.env.BESTBUY_API_KEY!,
  });
  const filter = `search=${encodeURIComponent(searchTerm)}&categoryPath.id=${LAPTOP_CATEGORY_ID}`;
  const url = `${BASE_URL}/products(${filter})?${qs.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data: BestBuyApiResponse = await res.json();
  if (data.error) return [];
  return (data.products ?? []).map(mapProduct);
}

export async function searchBestBuyProducts(
  query: string,
  pageSize = 10
): Promise<BestBuyProduct[]> {
  if (!isConfigured()) return [];

  const cacheKey = `bestbuy:v4:${query}:${pageSize}`;

  // Race cache vs live API — concurrent, not sequential
  const [cacheResult, apiResult] = await Promise.allSettled([
    withTimeout(cacheGetJson<BestBuyProduct[]>(cacheKey), 1000, null),
    withTimeout(fetchFromApi(query, pageSize), API_TIMEOUT_MS, []),
  ]);

  const cached = cacheResult.status === "fulfilled" ? cacheResult.value : null;
  if (cached) return cached;

  const fresh = apiResult.status === "fulfilled" ? apiResult.value : [];
  if (fresh.length > 0) {
    cacheSetJson(cacheKey, fresh, CACHE_TTL).catch(() => {});
  }
  return fresh;
}

export async function getBestBuyProductBySku(sku: string): Promise<BestBuyProduct | null> {
  if (!isConfigured()) return null;

  const fetch$ = async () => {
    const url = `${BASE_URL}/products/${sku}.json?show=${SHOW_FIELDS}&apiKey=${process.env.BESTBUY_API_KEY}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const p: BestBuyApiProduct = await res.json();
    return mapProduct(p);
  };

  return withTimeout(fetch$(), API_TIMEOUT_MS, null);
}
