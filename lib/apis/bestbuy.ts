import axios from "axios";
import { getCached, setCached } from "@/lib/redis";
import { bestBuyThrottle } from "@/lib/utils/throttle";

const BASE = "https://api.bestbuy.com/v1";
const CACHE_TTL = 30 * 60; // 30 minutes

export interface BestBuyProduct {
  sku: string;
  name: string;
  regularPrice: number;
  salePrice: number;
  onSale: boolean;
  inStoreAvailability: boolean;
  onlineAvailability: boolean;
  url: string;
  thumbnailImage?: string;
  modelNumber?: string;
  brand?: string;
  shortDescription?: string;
}

export interface BestBuyResult {
  products: BestBuyProduct[];
  total: number;
  fetchedAt: string;
}

function mapProduct(p: Record<string, unknown>): BestBuyProduct {
  return {
    sku: String(p.sku ?? ""),
    name: String(p.name ?? ""),
    regularPrice: Number(p.regularPrice ?? 0),
    salePrice: Number(p.salePrice ?? 0),
    onSale: Boolean(p.onSale),
    inStoreAvailability: Boolean(p.inStoreAvailability),
    onlineAvailability: Boolean(p.onlineAvailability),
    url: `https://www.bestbuy.com/site/${p.sku}.p`,
    thumbnailImage: p.thumbnailImage ? String(p.thumbnailImage) : undefined,
    modelNumber: p.modelNumber ? String(p.modelNumber) : undefined,
    brand: p.brand ? String(p.brand) : undefined,
    shortDescription: p.shortDescription
      ? String(p.shortDescription)
      : undefined,
  };
}

async function searchBestBuy(query: string, pageSize = 10): Promise<BestBuyResult> {
  const res = await axios.get(`${BASE}/products`, {
    params: {
      apiKey: process.env.BESTBUY_KEY,
      format: "json",
      q: query,
      show:
        "sku,name,regularPrice,salePrice,onSale,inStoreAvailability,onlineAvailability,thumbnailImage,modelNumber,brand,shortDescription",
      pageSize,
      sort: "bestSellingRank.asc",
    },
    timeout: 10000,
  });

  return {
    products: (res.data.products ?? []).map(mapProduct),
    total: res.data.total ?? 0,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getBestBuyPrices(
  productName: string
): Promise<BestBuyResult> {
  const cacheKey = `bestbuy:search:${productName.toLowerCase().replace(/\s+/g, "-")}`;
  const cached = await getCached<BestBuyResult>(cacheKey);
  if (cached) return cached;

  const data = await bestBuyThrottle.call(() =>
    searchBestBuy(productName)
  );

  await setCached(cacheKey, data, CACHE_TTL);
  return data;
}

export async function getBestBuyBySku(sku: string): Promise<BestBuyProduct | null> {
  const cacheKey = `bestbuy:sku:${sku}`;
  const cached = await getCached<BestBuyProduct>(cacheKey);
  if (cached) return cached;

  const res = await bestBuyThrottle.call(() =>
    axios.get(`${BASE}/products/${sku}.json`, {
      params: {
        apiKey: process.env.BESTBUY_KEY,
        format: "json",
        show:
          "sku,name,regularPrice,salePrice,onSale,inStoreAvailability,onlineAvailability,thumbnailImage,modelNumber,brand,shortDescription",
      },
      timeout: 10000,
    })
  );

  const product = mapProduct(res.data);
  await setCached(cacheKey, product, CACHE_TTL);
  return product;
}
