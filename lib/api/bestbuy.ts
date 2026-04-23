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
  brand: string;
  modelNumber: string;
}

interface BestBuyApiResponse {
  products?: BestBuyApiProduct[];
  total?: number;
}

const BASE_URL = "https://api.bestbuy.com/v1";
const CACHE_TTL = 1800;
const FETCH_TIMEOUT_MS = 6000;

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
    brand: p.brand,
    modelNumber: p.modelNumber,
  };
}

async function doSearch(query: string, pageSize: number): Promise<BestBuyProduct[]> {
  // Best Buy OData search: parentheses must NOT have URL-encoded content inside
  // Correct format: /products(search=hp omen) — spaces encoded as %20
  const searchTerm = query.replace(/[()]/g, "").trim();
  const qs = new URLSearchParams({
    format: "json",
    pageSize: String(pageSize),
    show: "sku,name,regularPrice,salePrice,onSale,inStoreAvailability,onlineAvailability,url,image,brand,modelNumber",
    apiKey: process.env.BESTBUY_API_KEY!,
  });
  // Build URL with raw search term in parentheses (Best Buy API syntax)
  const url = `${BASE_URL}/products(search=${encodeURIComponent(searchTerm)})?${qs.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data: BestBuyApiResponse = await res.json();
  return (data.products ?? []).map(mapProduct);
}

export async function searchBestBuyProducts(
  query: string,
  pageSize = 10
): Promise<BestBuyProduct[]> {
  if (!isConfigured()) return [];

  const cacheKey = `bestbuy:v2:${query}:${pageSize}`;
  const cached = await cacheGetJson<BestBuyProduct[]>(cacheKey);
  if (cached) return cached;

  const products = await withTimeout(doSearch(query, pageSize), FETCH_TIMEOUT_MS, []);

  if (products.length > 0) {
    await cacheSetJson(cacheKey, products, CACHE_TTL);
  }
  return products;
}

export async function getBestBuyProductBySku(
  sku: string
): Promise<BestBuyProduct | null> {
  if (!isConfigured()) return null;

  const cacheKey = `bestbuy:sku:${sku}`;
  const cached = await cacheGetJson<BestBuyProduct>(cacheKey);
  if (cached) return cached;

  const fetch$ = async () => {
    const url = `${BASE_URL}/products/${sku}.json?show=sku,name,regularPrice,salePrice,onSale,inStoreAvailability,onlineAvailability,url,image,brand,modelNumber&apiKey=${process.env.BESTBUY_API_KEY}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const p: BestBuyApiProduct = await res.json();
    return mapProduct(p);
  };

  const product = await withTimeout(fetch$(), FETCH_TIMEOUT_MS, null);
  if (product) await cacheSetJson(cacheKey, product, CACHE_TTL);
  return product;
}
