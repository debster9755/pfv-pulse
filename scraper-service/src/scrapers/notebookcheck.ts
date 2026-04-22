import { newContext } from "../browser";
import { getCache, setCache } from "../cache";
import { sleep } from "../utils";

export interface NotebookcheckBenchmark {
  productName: string;
  url: string;
  cinebenchR23Multi?: number;
  cinebenchR23Single?: number;
  geekbench6Multi?: number;
  geekbench6Single?: number;
  timespy?: number;
  firestrike?: number;
  blender?: number;
  thermalTjMax?: number;
  fanNoiseDb?: number;
  batteryLifeHrs?: number;
  overallRating?: number;
  source: "notebookcheck";
}

export interface NotebookcheckReview {
  productName: string;
  url: string;
  title: string;
  rating: number;
  pros: string[];
  cons: string[];
  verdict: string;
  source: "notebookcheck";
}

function parseBenchmarkNumber(text: string): number | undefined {
  const n = parseFloat(text.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? undefined : n;
}

export async function scrapeNotebookcheck(productName: string): Promise<{
  benchmark: NotebookcheckBenchmark | null;
  review: NotebookcheckReview | null;
}> {
  const cacheKey = `scrape:nbc:${productName.toLowerCase().replace(/\s+/g, "-")}`;
  const cached = await getCache<{ benchmark: NotebookcheckBenchmark | null; review: NotebookcheckReview | null }>(cacheKey);
  if (cached) return cached;

  const context = await newContext(process.env.PROXY_URL);
  const page = await context.newPage();
  await page.route("**/*.{png,jpg,jpeg,gif,webp}", (r) => r.abort());

  try {
    const searchUrl = `https://www.notebookcheck.net/Search.8222.0.html?str=${encodeURIComponent(productName)}&type=review`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(1000);

    const firstLink = await page.$eval(
      ".search_result a[href*='review']",
      (a) => (a as HTMLAnchorElement).href
    ).catch(() => null);

    if (!firstLink) {
      const empty = { benchmark: null, review: null };
      await setCache(cacheKey, empty, 3600);
      return empty;
    }

    await page.goto(firstLink, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(1200);

    const data = await page.evaluate(() => {
      const getText = (sel: string) =>
        document.querySelector(sel)?.textContent?.trim() ?? "";

      // Benchmarks from the benchmark table
      const benchRow = (label: string): string => {
        const rows = Array.from(document.querySelectorAll("table tr"));
        for (const row of rows) {
          if (row.textContent?.includes(label)) {
            const cells = Array.from(row.querySelectorAll("td"));
            return cells[1]?.textContent?.trim() ?? "";
          }
        }
        return "";
      };

      // Review fields
      const pros = Array.from(document.querySelectorAll(".pros li")).map((e) => e.textContent?.trim() ?? "").filter(Boolean);
      const cons = Array.from(document.querySelectorAll(".cons li")).map((e) => e.textContent?.trim() ?? "").filter(Boolean);
      const verdict = getText(".verdict, .pro_con_verdict");
      const ratingText = getText(".ratingPercent, .ratingValue");
      const rating = parseFloat(ratingText.replace(/[^0-9.]/g, "")) || 0;
      const title = getText("h1");

      return {
        title,
        pros,
        cons,
        verdict,
        rating,
        cinebenchR23Multi: benchRow("Cinebench R23 Multi"),
        cinebenchR23Single: benchRow("Cinebench R23 Single"),
        geekbench6Multi: benchRow("Geekbench 6 Multi"),
        geekbench6Single: benchRow("Geekbench 6 Single"),
        timespy: benchRow("3DMark Time Spy"),
        firestrike: benchRow("3DMark Fire Strike"),
        blender: benchRow("Blender"),
        thermalTjMax: benchRow("Throttling"),
        fanNoiseDb: benchRow("Fan Noise"),
        batteryLifeHrs: benchRow("Battery Life"),
        overallRating: rating,
      };
    });

    const parsedBenchmark: NotebookcheckBenchmark = {
      productName,
      url: firstLink,
      cinebenchR23Multi: parseBenchmarkNumber(data.cinebenchR23Multi),
      cinebenchR23Single: parseBenchmarkNumber(data.cinebenchR23Single),
      geekbench6Multi: parseBenchmarkNumber(data.geekbench6Multi),
      geekbench6Single: parseBenchmarkNumber(data.geekbench6Single),
      timespy: parseBenchmarkNumber(data.timespy),
      firestrike: parseBenchmarkNumber(data.firestrike),
      blender: parseBenchmarkNumber(data.blender),
      thermalTjMax: parseBenchmarkNumber(data.thermalTjMax),
      fanNoiseDb: parseBenchmarkNumber(data.fanNoiseDb),
      batteryLifeHrs: parseBenchmarkNumber(data.batteryLifeHrs),
      overallRating: data.overallRating,
      source: "notebookcheck",
    };

    const parsedReview: NotebookcheckReview = {
      productName,
      url: firstLink,
      title: data.title,
      rating: data.rating,
      pros: data.pros,
      cons: data.cons,
      verdict: data.verdict,
      source: "notebookcheck",
    };

    const result = { benchmark: parsedBenchmark, review: parsedReview };
    await setCache(cacheKey, result, 3600 * 6);
    return result;
  } catch (err) {
    const fallback = await getCache<{ benchmark: NotebookcheckBenchmark | null; review: NotebookcheckReview | null }>(cacheKey);
    if (fallback) return fallback;
    throw err;
  } finally {
    await context.close();
  }
}
