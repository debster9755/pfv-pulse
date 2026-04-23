import { Browser } from "playwright";

export interface BenchmarkEntry {
  name: string;
  score: string;
  unit: string;
}

export interface NotebookcheckData {
  productName: string;
  benchmarks: BenchmarkEntry[];
  url: string;
}

export async function scrapeNotebookcheck(
  browser: Browser,
  productSlug: string
): Promise<NotebookcheckData | null> {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    const searchUrl = `https://www.notebookcheck.net/Search.251.0.html?recherche=${encodeURIComponent(productSlug)}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1000);

    const firstLink = await page.$eval(
      ".search_results a, .nc_header a",
      (el: Element) => (el as HTMLAnchorElement).href
    ).catch(() => null);

    if (!firstLink) return null;

    await page.goto(firstLink, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1500);

    const productName = await page
      .$eval("h1", (el) => el.textContent?.trim() ?? "")
      .catch(() => productSlug);

    const benchmarks = await page.$$eval(
      ".benchmarks tr, .gscore_table tr",
      (rows) =>
        rows.slice(0, 15).map((row) => {
          const cells = row.querySelectorAll("td");
          return {
            name: cells[0]?.textContent?.trim() ?? "",
            score: cells[1]?.textContent?.trim() ?? "",
            unit: cells[2]?.textContent?.trim() ?? "",
          };
        })
    ).catch(() => []);

    return {
      productName,
      benchmarks: benchmarks.filter((b) => b.name),
      url: firstLink,
    };
  } catch {
    return null;
  } finally {
    await context.close();
  }
}
