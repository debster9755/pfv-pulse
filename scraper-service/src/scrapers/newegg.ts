import { newContext } from "../browser";
import { getCache, setCache } from "../cache";
import { sleep } from "../utils";

export interface NeweggProduct {
  name: string;
  sku: string;
  price: number;
  shipping: number;
  inStock: boolean;
  url: string;
  rating: number;
  reviewCount: number;
}

export async function scrapeNewegg(query: string): Promise<NeweggProduct[]> {
  const cacheKey = `scrape:newegg:${query.toLowerCase().replace(/\s+/g, "-")}`;
  const cached = await getCache<NeweggProduct[]>(cacheKey);
  if (cached) return cached;

  const context = await newContext(process.env.PROXY_URL);
  const page = await context.newPage();

  // Block images and fonts to speed up scraping
  await page.route("**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf}", (route) =>
    route.abort()
  );

  try {
    const searchUrl = `https://www.newegg.com/p/pl?d=${encodeURIComponent(query)}&N=4131`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(2000 + Math.random() * 1000);

    // Handle captcha — graceful fallback
    const captcha = await page.$(".captcha-container, #captchacharacters");
    if (captcha) {
      const fallback = await getCache<NeweggProduct[]>(cacheKey);
      if (fallback) return fallback;
      throw new Error("Newegg blocked by CAPTCHA");
    }

    const products: NeweggProduct[] = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".item-cell"));
      return items.slice(0, 15).map((item) => {
        const name = item.querySelector(".item-title")?.textContent?.trim() ?? "";
        const priceWhole = item.querySelector(".price-current strong")?.textContent?.trim() ?? "0";
        const priceCents = item.querySelector(".price-current sup")?.textContent?.trim() ?? "0";
        const price = parseFloat(`${priceWhole}.${priceCents}`) || 0;
        const shipping = parseFloat(
          (item.querySelector(".price-ship")?.textContent ?? "0").replace(/[^0-9.]/g, "")
        ) || 0;
        const inStock = !item.querySelector(".item-promo-soldout");
        const link = (item.querySelector(".item-title") as HTMLAnchorElement)?.href ?? "";
        const skuEl = item.querySelector(".item-info .item-number");
        const sku = skuEl?.textContent?.replace(/Item#:/i, "").trim() ?? "";
        const stars = parseFloat(item.querySelector(".rating i")?.className.match(/(\d+)/)?.[1] ?? "0") / 20;
        const reviewCount = parseInt(
          (item.querySelector(".item-rating-num")?.textContent ?? "0").replace(/[^0-9]/g, ""),
          10
        );
        return { name, sku, price, shipping, inStock, url: link, rating: stars, reviewCount };
      }).filter((p) => p.price > 0 && p.name.length > 0);
    });

    await setCache(cacheKey, products, 3600);
    return products;
  } catch (err) {
    const fallback = await getCache<NeweggProduct[]>(cacheKey);
    if (fallback) return fallback;
    throw err;
  } finally {
    await context.close();
  }
}
