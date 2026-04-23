import { withTimeout } from "@/lib/timeout";
import { cacheGetJson, cacheSetJson } from "@/lib/redis";

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

function getKey(): string {
  return (process.env.BESTBUY_API_KEY ?? "").trim();
}

function isConfigured(): boolean {
  return Boolean(getKey());
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
    apiKey: getKey(),
  });
  // %26 encodes & so WHATWG URL parsers don't split the OData filter
  const filter = `search=${encodeURIComponent(searchTerm)}%26categoryPath.id=${LAPTOP_CATEGORY_ID}`;
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

  // Check cache first — non-blocking 800ms max
  const cacheKey = `bestbuy:v5:${query}:${pageSize}`;
  try {
    const cached = await withTimeout(
      cacheGetJson<BestBuyProduct[]>(cacheKey),
      800,
      null
    );
    if (cached && cached.length > 0) return cached;
  } catch {
    // cache unavailable — proceed to live fetch
  }

  // Live API fetch with hard timeout
  const products = await withTimeout(fetchFromApi(query, pageSize), API_TIMEOUT_MS, []);

  // Write to cache in background — never await this
  if (products.length > 0) {
    cacheSetJson(cacheKey, products, CACHE_TTL).catch(() => {});
  }
  return products;
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
