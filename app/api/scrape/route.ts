import { NextRequest } from "next/server";
import axios from "axios";
import { prisma } from "@/lib/prisma";
import { scoreText } from "@/lib/engines/sentiment";

const SCRAPER_URL = process.env.SCRAPER_SERVICE_URL ?? "http://localhost:3001";
const SCRAPER_KEY = process.env.SCRAPER_INTERNAL_KEY ?? "changeme";

const scraperClient = axios.create({
  baseURL: SCRAPER_URL,
  headers: { "x-internal-key": SCRAPER_KEY },
  timeout: 60000,
});

const ScrapeTypeSchema = ["prices", "benchmarks", "reviews", "full"] as const;
type ScrapeType = (typeof ScrapeTypeSchema)[number];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, type = "full" } = body as { productId: string; type: ScrapeType };

    if (!productId) {
      return Response.json({ error: "productId is required." }, { status: 400 });
    }
    if (!ScrapeTypeSchema.includes(type)) {
      return Response.json({ error: `type must be one of: ${ScrapeTypeSchema.join(", ")}` }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return Response.json({ error: "Product not found." }, { status: 404 });
    }

    const run = await prisma.scraperRun.create({
      data: { target: product.name, status: "RUNNING" },
    });

    // Fire-and-forget the actual scrape — return immediately so Vercel doesn't timeout
    scrapeInBackground(run.id, product.id, product.name, type).catch(console.error);

    return Response.json({ runId: run.id, status: "RUNNING", message: "Scrape started." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get("runId");

  if (runId) {
    const run = await prisma.scraperRun.findUnique({ where: { id: runId } });
    return Response.json(run ?? { error: "Run not found." });
  }

  const runs = await prisma.scraperRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
  });
  return Response.json({ runs });
}

async function scrapeInBackground(
  runId: string,
  productId: string,
  productName: string,
  type: ScrapeType
) {
  let updated = 0;
  try {
    const { data } = await scraperClient.post(`/scrape/${type}`, { query: productName });

    // Persist prices
    if (type === "prices" || type === "full") {
      const priceData = type === "full" ? data.prices : data;
      const priceRecords = [
        ...(priceData.hp ?? []).map((p: { price: number; url: string; inStock: boolean }) => ({
          productId,
          retailer: "HP Official",
          price: p.price,
          url: p.url,
          inStock: p.inStock,
          source: "SCRAPER" as const,
        })),
        ...(priceData.newegg ?? []).map((p: { price: number; url: string; inStock: boolean }) => ({
          productId,
          retailer: "Newegg",
          price: p.price,
          url: p.url,
          inStock: p.inStock,
          source: "SCRAPER" as const,
        })),
      ];
      if (priceRecords.length > 0) {
        await prisma.price.createMany({ data: priceRecords });
        updated += priceRecords.length;
      }
    }

    // Persist benchmarks
    if (type === "benchmarks" || type === "full") {
      const bench = type === "full" ? data.benchmarks?.benchmark : data.benchmark;
      if (bench) {
        await prisma.benchmark.create({
          data: {
            productId,
            source: "notebookcheck",
            cinebenchR23Multi: bench.cinebenchR23Multi,
            cinebenchR23Single: bench.cinebenchR23Single,
            geekbench6Multi: bench.geekbench6Multi,
            geekbench6Single: bench.geekbench6Single,
            timespy: bench.timespy,
            firestrike: bench.firestrike,
            blender: bench.blender,
            thermalTjMax: bench.thermalTjMax,
            fanNoiseDb: bench.fanNoiseDb,
            batteryLifeHrs: bench.batteryLifeHrs,
            aggregateScore: bench.overallRating,
          },
        });
        updated++;
      }
    }

    // Persist reviews
    if (type === "reviews" || type === "full") {
      const reviews = type === "full" ? data.reviews : data.reviews ?? [];
      for (const r of reviews) {
        const sentiment = scoreText(`${r.title ?? ""} ${r.verdict ?? ""}`);
        await prisma.review.create({
          data: {
            productId,
            source: r.source,
            url: r.url,
            title: r.title,
            body: r.verdict,
            rating: r.rating,
            sentimentScore: sentiment.score,
            sentimentLabel: sentiment.label as "POSITIVE" | "NEGATIVE" | "NEUTRAL",
            positiveCount: sentiment.positiveCount,
            negativeCount: sentiment.negativeCount,
            publishedAt: r.publishedAt ? new Date(r.publishedAt) : null,
          },
        });
        updated++;
      }
    }

    await prisma.scraperRun.update({
      where: { id: runId },
      data: { status: "COMPLETED", productsUpdated: updated, completedAt: new Date() },
    });
  } catch (err) {
    await prisma.scraperRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
        completedAt: new Date(),
      },
    });
  }
}
