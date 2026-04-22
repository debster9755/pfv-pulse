import { newContext } from "../browser";
import { getCache, setCache } from "../cache";
import { sleep } from "../utils";

export interface ScrapedReview {
  source: string;
  productName: string;
  url: string;
  title: string;
  rating: number;
  pros: string[];
  cons: string[];
  verdict: string;
  publishedAt: string;
}

// ── Generic review scraper config ──────────────────────────────────────────

interface SiteConfig {
  name: string;
  searchUrl: (q: string) => string;
  resultLinkSelector: string;
  titleSelector: string;
  ratingSelector: string;
  prosSelector: string;
  consSelector: string;
  verdictSelector: string;
  dateSelector: string;
}

const SITES: SiteConfig[] = [
  {
    name: "rtings",
    searchUrl: (q) => `https://www.rtings.com/laptop/1-0-0/graph#49`,
    resultLinkSelector: "a[href*='/laptop/reviews/']",
    titleSelector: "h1",
    ratingSelector: ".score-container .score",
    prosSelector: ".pros li",
    consSelector: ".cons li",
    verdictSelector: ".review-verdict, .test-conclusion",
    dateSelector: "time[datetime]",
  },
  {
    name: "pcmag",
    searchUrl: (q) =>
      `https://www.pcmag.com/search?q=${encodeURIComponent(q)}&type=review`,
    resultLinkSelector: ".search-results a[href*='review']",
    titleSelector: "h1.article-title",
    ratingSelector: ".rating-score",
    prosSelector: ".pros li, .our-verdict .positive li",
    consSelector: ".cons li, .our-verdict .negative li",
    verdictSelector: ".our-verdict p, .verdict-text",
    dateSelector: "time[datetime], .article-date",
  },
  {
    name: "laptopmag",
    searchUrl: (q) =>
      `https://www.laptopmag.com/search?searchTerm=${encodeURIComponent(q)}`,
    resultLinkSelector: "a[href*='/reviews/']",
    titleSelector: "h1",
    ratingSelector: ".score-container, .verdict-score, .rating",
    prosSelector: ".pros li",
    consSelector: ".cons li",
    verdictSelector: ".verdict, .bottom-line",
    dateSelector: "time[datetime], .article-published-date",
  },
];

async function scrapeSite(
  config: SiteConfig,
  productName: string
): Promise<ScrapedReview | null> {
  const cacheKey = `scrape:review:${config.name}:${productName.toLowerCase().replace(/\s+/g, "-")}`;
  const cached = await getCache<ScrapedReview>(cacheKey);
  if (cached) return cached;

  const context = await newContext(process.env.PROXY_URL);
  const page = await context.newPage();
  await page.route("**/*.{png,jpg,jpeg,gif,webp,woff,woff2}", (r) => r.abort());

  try {
    await page.goto(config.searchUrl(productName), {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });
    await sleep(1200 + Math.random() * 800);

    const reviewLink = await page
      .$eval(config.resultLinkSelector, (a) => (a as HTMLAnchorElement).href)
      .catch(() => null);

    if (!reviewLink) return null;

    await page.goto(reviewLink, { waitUntil: "domcontentloaded", timeout: 25000 });
    await sleep(1000);

    const review = await page.evaluate(
      ({ titleSel, ratingSel, prosSel, consSel, verdictSel, dateSel, source, productName, url }) => {
        const getText = (sel: string) =>
          document.querySelector(sel)?.textContent?.trim() ?? "";
        const getAll = (sel: string) =>
          Array.from(document.querySelectorAll(sel))
            .map((el) => el.textContent?.trim() ?? "")
            .filter(Boolean);

        const ratingText = getText(ratingSel).replace(/\/.*/, "").trim();
        const rating = parseFloat(ratingText) || 0;

        const dateEl = document.querySelector(dateSel);
        const publishedAt =
          dateEl?.getAttribute("datetime") ??
          dateEl?.textContent?.trim() ??
          new Date().toISOString();

        return {
          source,
          productName,
          url,
          title: getText(titleSel),
          rating,
          pros: getAll(prosSel),
          cons: getAll(consSel),
          verdict: getText(verdictSel),
          publishedAt,
        } as ScrapedReview;
      },
      {
        titleSel: config.titleSelector,
        ratingSel: config.ratingSelector,
        prosSel: config.prosSelector,
        consSel: config.consSelector,
        verdictSel: config.verdictSelector,
        dateSel: config.dateSelector,
        source: config.name,
        productName,
        url: reviewLink,
      }
    );

    await setCache(cacheKey, review, 3600 * 12);
    return review;
  } catch (err) {
    const fallback = await getCache<ScrapedReview>(cacheKey);
    if (fallback) return fallback;
    console.error(`[${config.name}] scrape failed for "${productName}":`, (err as Error).message);
    return null;
  } finally {
    await context.close();
  }
}

export async function scrapeAllReviewSites(
  productName: string
): Promise<ScrapedReview[]> {
  // Run sites sequentially to avoid browser memory spikes on Railway free tier
  const results: ScrapedReview[] = [];
  for (const site of SITES) {
    const result = await scrapeSite(site, productName);
    if (result) results.push(result);
    await sleep(500);
  }
  return results;
}
