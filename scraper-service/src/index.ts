import express from "express";
import { chromium, Browser } from "playwright";
import { scrapeHpStore } from "./scrapers/hp-store";
import { scrapeNewegg } from "./scrapers/newegg";
import { scrapeNotebookcheck } from "./scrapers/notebookcheck";
import { scrapeAllReviews } from "./scrapers/reviews";

const app = express();
app.use(express.json());

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return browser;
}

// Simple in-memory cache for scraper results
const scraperCache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = scraperCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    scraperCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  scraperCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/scrape/prices", async (req, res) => {
  const query = String(req.query.q ?? "");
  if (!query) return res.status(400).json({ error: "q is required" });

  const cacheKey = `prices:${query}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const b = await getBrowser();
    const [hp, newegg] = await Promise.allSettled([
      scrapeHpStore(b, query),
      scrapeNewegg(b, query),
    ]);
    const result = {
      hp: hp.status === "fulfilled" ? hp.value : [],
      newegg: newegg.status === "fulfilled" ? newegg.value : [],
      scrapedAt: new Date().toISOString(),
    };
    setCache(cacheKey, result);
    return res.json(result);
  } catch {
    return res.status(500).json({ error: "Scrape failed", hp: [], newegg: [] });
  }
});

app.get("/scrape/benchmarks", async (req, res) => {
  const product = String(req.query.product ?? "");
  if (!product) return res.status(400).json({ error: "product is required" });

  const cacheKey = `benchmarks:${product}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const b = await getBrowser();
    const data = await scrapeNotebookcheck(b, product);
    const result = data ?? { productName: product, benchmarks: [], url: "" };
    setCache(cacheKey, result);
    return res.json(result);
  } catch {
    return res.status(500).json({ productName: product, benchmarks: [], url: "" });
  }
});

app.get("/scrape/reviews", async (req, res) => {
  const product = String(req.query.product ?? "");
  if (!product) return res.status(400).json({ error: "product is required" });

  const cacheKey = `reviews:${product}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const b = await getBrowser();
    const reviews = await scrapeAllReviews(b, product);
    setCache(cacheKey, reviews);
    return res.json(reviews);
  } catch {
    return res.status(500).json([]);
  }
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, async () => {
  try {
    await getBrowser();
    console.log(`Scraper service running on :${PORT}`);
  } catch {
    console.error("Failed to launch browser on startup — will retry per request");
  }
});

process.on("SIGTERM", async () => {
  if (browser) await browser.close();
  process.exit(0);
});
