import { newContext } from "../browser";
import { getCache, setCache } from "../cache";
import { sleep } from "../utils";

export interface HpProduct {
  name: string;
  sku: string;
  price: number;
  msrp: number;
  inStock: boolean;
  url: string;
  specs: Record<string, string>;
}

export async function scrapeHpStore(query: string): Promise<HpProduct[]> {
  const cacheKey = `scrape:hp:${query.toLowerCase().replace(/\s+/g, "-")}`;
  const cached = await getCache<HpProduct[]>(cacheKey);
  if (cached) return cached;

  const context = await newContext(process.env.PROXY_URL);
  const page = await context.newPage();

  try {
    const url = `https://www.hp.com/us-en/shop/slp/${encodeURIComponent(query)}/laptops`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(1500 + Math.random() * 1000);

    const products: HpProduct[] = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("[data-testid='product-card']"));
      return cards.slice(0, 10).map((card) => {
        const name = card.querySelector("[data-testid='product-name']")?.textContent?.trim() ?? "";
        const priceEl = card.querySelector("[data-testid='current-price'], .price-current, .price");
        const price = parseFloat((priceEl?.textContent ?? "0").replace(/[^0-9.]/g, "")) || 0;
        const msrpEl = card.querySelector(".strike-through, [data-testid='original-price']");
        const msrp = parseFloat((msrpEl?.textContent ?? "0").replace(/[^0-9.]/g, "")) || price;
        const link = (card.querySelector("a") as HTMLAnchorElement)?.href ?? "";
        const outOfStock = !!card.querySelector(".out-of-stock, [data-testid='out-of-stock']");
        return { name, sku: "", price, msrp, inStock: !outOfStock, url: link, specs: {} };
      }).filter((p) => p.price > 0);
    });

    // enrich with specs from first result's PDP
    for (const product of products.slice(0, 3)) {
      if (!product.url) continue;
      try {
        await page.goto(product.url, { waitUntil: "domcontentloaded", timeout: 20000 });
        await sleep(800);
        const specs = await page.evaluate(() => {
          const result: Record<string, string> = {};
          document.querySelectorAll(".spec-row, .pdp-spec-row, [data-testid='spec-row']").forEach((row) => {
            const label = row.querySelector(".spec-label, th")?.textContent?.trim() ?? "";
            const value = row.querySelector(".spec-value, td")?.textContent?.trim() ?? "";
            if (label && value) result[label] = value;
          });
          const skuEl = document.querySelector("[data-testid='sku'], .product-number");
          if (skuEl) result["__sku"] = skuEl.textContent?.trim() ?? "";
          return result;
        });
        product.specs = specs;
        product.sku = specs["__sku"] ?? "";
        delete product.specs["__sku"];
      } catch {
        // skip spec enrichment on error
      }
    }

    await setCache(cacheKey, products, 3600 * 2);
    return products;
  } catch (err) {
    const fallback = await getCache<HpProduct[]>(cacheKey);
    if (fallback) return fallback;
    throw err;
  } finally {
    await context.close();
  }
}
