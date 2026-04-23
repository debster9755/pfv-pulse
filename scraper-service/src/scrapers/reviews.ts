import { Browser } from "playwright";

export interface ScrapedReview {
  source: string;
  title: string;
  rating: number | null;
  url: string;
  scrapedAt: string;
}

async function scrapeRtings(browser: Browser, product: string): Promise<ScrapedReview[]> {
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  });
  const page = await context.newPage();
  const results: ScrapedReview[] = [];
  try {
    const url = `https://www.rtings.com/laptop/reviews/search#query=${encodeURIComponent(product)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1500);
    const items = await page.$$eval(
      ".search_result, .review_result",
      (els) =>
        els.slice(0, 3).map((el) => ({
          title: el.querySelector("h3, .title")?.textContent?.trim() ?? "",
          rating: el.querySelector(".score, .rating")?.textContent?.trim() ?? "",
          url: el.querySelector("a")?.href ?? "",
        }))
    ).catch(() => []);
    for (const item of items) {
      const ratingMatch = item.rating.match(/[\d.]+/);
      results.push({
        source: "rtings",
        title: item.title,
        rating: ratingMatch ? parseFloat(ratingMatch[0]) : null,
        url: item.url,
        scrapedAt: new Date().toISOString(),
      });
    }
  } catch {
    // fail silently
  } finally {
    await context.close();
  }
  return results;
}

async function scrapePcmag(browser: Browser, product: string): Promise<ScrapedReview[]> {
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  });
  const page = await context.newPage();
  const results: ScrapedReview[] = [];
  try {
    const url = `https://www.pcmag.com/search?q=${encodeURIComponent(product)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1000);
    const items = await page.$$eval(
      "article.item, .review-item",
      (els) =>
        els.slice(0, 3).map((el) => ({
          title: el.querySelector("h3, h2, .title")?.textContent?.trim() ?? "",
          rating: el.querySelector(".rating, .score")?.textContent?.trim() ?? "",
          url: el.querySelector("a")?.href ?? "",
        }))
    ).catch(() => []);
    for (const item of items) {
      const ratingMatch = item.rating.match(/[\d.]+/);
      results.push({
        source: "pcmag",
        title: item.title,
        rating: ratingMatch ? parseFloat(ratingMatch[0]) : null,
        url: item.url,
        scrapedAt: new Date().toISOString(),
      });
    }
  } catch {
    // fail silently
  } finally {
    await context.close();
  }
  return results;
}

export async function scrapeAllReviews(
  browser: Browser,
  product: string
): Promise<ScrapedReview[]> {
  const [rtings, pcmag] = await Promise.allSettled([
    scrapeRtings(browser, product),
    scrapePcmag(browser, product),
  ]);

  return [
    ...(rtings.status === "fulfilled" ? rtings.value : []),
    ...(pcmag.status === "fulfilled" ? pcmag.value : []),
  ];
}
