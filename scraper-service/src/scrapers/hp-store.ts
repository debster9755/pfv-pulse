import { Browser } from "playwright";

export interface HpProduct {
  name: string;
  price: number | null;
  url: string;
  sku: string | null;
}

export async function scrapeHpStore(
  browser: Browser,
  query: string
): Promise<HpProduct[]> {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  const results: HpProduct[] = [];

  try {
    const url = `https://www.hp.com/us-en/shop/slp/laptops/gaming#/config?isFamilyStore=true&q=${encodeURIComponent(query)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2000);

    const items = await page.$$eval(
      "[data-testid='product-card'], .product-item, .product-card",
      (cards) =>
        cards.slice(0, 10).map((card) => {
          const nameEl = card.querySelector(
            "[data-testid='product-name'], .product-name, h3, h2"
          );
          const priceEl = card.querySelector(
            "[data-testid='product-price'], .price, .product-price"
          );
          const linkEl = card.querySelector("a");
          const skuEl = card.querySelector("[data-sku], [data-product-id]");
          return {
            name: nameEl?.textContent?.trim() ?? "",
            priceRaw: priceEl?.textContent?.trim() ?? "",
            url: linkEl?.href ?? "",
            sku: skuEl?.getAttribute("data-sku") ?? skuEl?.getAttribute("data-product-id") ?? null,
          };
        })
    );

    for (const item of items) {
      if (!item.name) continue;
      const cleaned = item.priceRaw.replace(/[^0-9.]/g, "");
      const price = cleaned ? parseFloat(cleaned) : null;
      results.push({ name: item.name, price, url: item.url, sku: item.sku });
    }
  } catch {
    // Return whatever was collected before failure
  } finally {
    await context.close();
  }

  return results;
}
