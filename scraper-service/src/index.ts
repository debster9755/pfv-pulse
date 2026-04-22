import express from "express";
import { z } from "zod";
import { scrapeHpStore } from "./scrapers/hp";
import { scrapeNewegg } from "./scrapers/newegg";
import { scrapeNotebookcheck } from "./scrapers/notebookcheck";
import { scrapeAllReviewSites } from "./scrapers/reviewSites";
import { scoreText } from "./sentiment";
import { closeBrowser } from "./browser";

const app = express();
app.use(express.json());

const PORT = process.env.PORT ?? 3001;
const INTERNAL_KEY = process.env.SCRAPER_INTERNAL_KEY ?? "changeme";

// Simple auth middleware
app.use((req, res, next) => {
  const key = req.headers["x-internal-key"];
  if (key !== INTERNAL_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
});

// ── Health check ──────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// ── Prices: HP + Newegg ───────────────────────────────────────────────────
const PricesSchema = z.object({ query: z.string().min(2) });

app.post("/scrape/prices", async (req, res) => {
  const parsed = PricesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { query } = parsed.data;

  try {
    const [hp, newegg] = await Promise.allSettled([
      scrapeHpStore(query),
      scrapeNewegg(query),
    ]);

    res.json({
      hp: hp.status === "fulfilled" ? hp.value : [],
      newegg: newegg.status === "fulfilled" ? newegg.value : [],
      hpError: hp.status === "rejected" ? hp.reason?.message : null,
      neweggError: newegg.status === "rejected" ? newegg.reason?.message : null,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Benchmarks + reviews: Notebookcheck ──────────────────────────────────
app.post("/scrape/benchmarks", async (req, res) => {
  const parsed = PricesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { query } = parsed.data;

  try {
    const result = await scrapeNotebookcheck(query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Reviews: rtings + pcmag + laptopmag ───────────────────────────────────
app.post("/scrape/reviews", async (req, res) => {
  const parsed = PricesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { query } = parsed.data;

  try {
    const reviews = await scrapeAllReviewSites(query);
    // Attach sentiment scores
    const scored = reviews.map((r) => {
      const sentiment = scoreText(`${r.title} ${r.verdict} ${r.pros.join(" ")} ${r.cons.join(" ")}`);
      return { ...r, sentiment };
    });
    res.json({ reviews: scored });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Full scrape: all targets for a product ────────────────────────────────
app.post("/scrape/full", async (req, res) => {
  const parsed = PricesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { query } = parsed.data;

  const [prices, benchmarks, reviews] = await Promise.allSettled([
    Promise.all([scrapeHpStore(query), scrapeNewegg(query)]),
    scrapeNotebookcheck(query),
    scrapeAllReviewSites(query),
  ]);

  res.json({
    prices:
      prices.status === "fulfilled"
        ? { hp: prices.value[0], newegg: prices.value[1] }
        : { hp: [], newegg: [], error: prices.reason?.message },
    benchmarks:
      benchmarks.status === "fulfilled"
        ? benchmarks.value
        : { benchmark: null, review: null, error: benchmarks.reason?.message },
    reviews:
      reviews.status === "fulfilled"
        ? reviews.value.map((r) => ({
            ...r,
            sentiment: scoreText(`${r.title} ${r.verdict} ${r.pros.join(" ")} ${r.cons.join(" ")}`),
          }))
        : [],
  });
});

app.listen(PORT, () => {
  console.log(`[scraper-service] listening on :${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await closeBrowser();
  process.exit(0);
});
