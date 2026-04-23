import { Browser } from "playwright";

export interface NeweggProduct {
  name: string;
  price: number | null;
  url: string;
  rating: number | null;
}

export async function scrapeNewegg(
  browser: Browser,
  query: string
): Promise<NeweggProduct[]> {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  const results: NeweggProduct[] = [];

  try {
    const url = `https://www.newegg.com/p/pl?d=${encodeURIComponent(query)}&N=4131`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1500);

    const items = await page.$$eval(".item-cell", (cells) =>
      cells.slice(0, 10).map((cell) => {
        const nameEl = cell.querySelector(".item-title");
        const priceEl = cell.querySelector(".price-current");
        const linkEl = cell.querySelector("a.item-title");
        const ratingEl = cell.querySelector(".item-rating i");
        return {
          name: nameEl?.textContent?.trim() ?? "",
          priceRaw: priceEl?.textContent?.trim() ?? "",
          url: linkEl?.getAttribute("href") ?? "",
          ratingRaw: ratingEl?.getAttribute("title") ?? "",
        };
      })
    );

    for (const item of items) {
      if (!item.name) continue;
      const cleaned = item.priceRaw.replace(/[^0-9.]/g, "");
      const price = cleaned ? parseFloat(cleaned) : null;
      const ratingMatch = item.ratingRaw.match(/[\d.]+/);
      const rating = ratingMatch ? parseFloat(ratingMatch[0]) : null;
      results.push({ name: item.name, price, url: item.url, rating });
    }
  } catch {
    // Return partial results
  } finally {
    await context.close();
  }

  return results;
}
