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
  brand: string;
  modelNumber: string;
}

interface BestBuyApiResponse {
  products?: BestBuyApiProduct[];
  total?: number;
}

const BASE_URL = "https://api.bestbuy.com/v1";
const CACHE_TTL = 1800; // 30 min

function isConfigured(): boolean {
  return Boolean(process.env.BESTBUY_API_KEY);
}

export async function searchBestBuyProducts(
  query: string,
  pageSize = 10
): Promise<BestBuyProduct[]> {
  if (!isConfigured()) return [];

  const cacheKey = `bestbuy:search:${query}:${pageSize}`;
  const cached = await cacheGetJson<BestBuyProduct[]>(cacheKey);
  if (cached) return cached;

  try {
    const encoded = encodeURIComponent(query);
    const url = `${BASE_URL}/products(search=${encoded})?format=json&pageSize=${pageSize}&show=sku,name,regularPrice,salePrice,onSale,inStoreAvailability,onlineAvailability,url,image,brand,modelNumber&apiKey=${process.env.BESTBUY_API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data: BestBuyApiResponse = await res.json();
    const products: BestBuyProduct[] = (data.products ?? []).map((p) => ({
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
    }));
    await cacheSetJson(cacheKey, products, CACHE_TTL);
    return products;
  } catch {
    return [];
  }
}

export async function getBestBuyProductBySku(
  sku: string
): Promise<BestBuyProduct | null> {
  if (!isConfigured()) return null;

  const cacheKey = `bestbuy:sku:${sku}`;
  const cached = await cacheGetJson<BestBuyProduct>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BASE_URL}/products/${sku}.json?show=sku,name,regularPrice,salePrice,onSale,inStoreAvailability,onlineAvailability,url,image,brand,modelNumber&apiKey=${process.env.BESTBUY_API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const p: BestBuyApiProduct = await res.json();
    const product: BestBuyProduct = {
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
    await cacheSetJson(cacheKey, product, CACHE_TTL);
    return product;
  } catch {
    return null;
  }
}
