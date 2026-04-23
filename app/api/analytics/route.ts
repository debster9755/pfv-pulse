import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateDeltas, calculateValueScore } from "@/lib/engines/delta";
import { fitPriceDeltaRegression, buildProjections } from "@/lib/engines/regression";
import { aggregateWoWSentiment } from "@/lib/engines/sentiment";
import { generateRecommendation } from "@/lib/engines/recommendation";
import { getCached, setCached } from "@/lib/redis";

const CACHE_TTL = 15 * 60; // 15 min

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get("targetId");

  if (!targetId) {
    return Response.json({ error: "targetId is required." }, { status: 400 });
  }

  const cacheKey = `analytics:${targetId}`;
  const cached = await getCached(cacheKey);
  if (cached) return Response.json(cached);

  const target = await prisma.product.findUnique({
    where: { id: targetId },
    include: {
      prices: { orderBy: { scrapedAt: "desc" }, take: 50 },
      benchmarks: { orderBy: { scrapedAt: "desc" }, take: 1 },
      reviews: { orderBy: { scrapedAt: "desc" }, take: 200 },
      salesData: { orderBy: { weekStartDate: "asc" }, take: 52 },
    },
  });

  if (!target) {
    return Response.json({ error: "Product not found." }, { status: 404 });
  }

  const competitors = await prisma.product.findMany({
    where: { isTarget: false },
    include: {
      prices: { orderBy: { scrapedAt: "desc" }, take: 20 },
      benchmarks: { orderBy: { scrapedAt: "desc" }, take: 1 },
    },
  });

  const currentPrice =
    target.prices.length > 0
      ? Math.min(...target.prices.map((p: { price: number }) => p.price))
      : target.msrp;

  const targetPricePoints = target.prices.map((p: { retailer: string; price: number }) => ({
    productId: target.id,
    productName: target.name,
    retailer: p.retailer,
    price: p.price,
  }));

  const competitorPricePoints = competitors.flatMap(
    (c: { id: string; name: string; prices: Array<{ retailer: string; price: number }> }) =>
      c.prices.map((p) => ({
        productId: c.id,
        productName: c.name,
        retailer: p.retailer,
        price: p.price,
      }))
  );

  const deltas = calculateDeltas(targetPricePoints, competitorPricePoints);

  const benchmark = target.benchmarks[0];
  const valueScore = benchmark?.aggregateScore
    ? calculateValueScore(target.id, benchmark.aggregateScore, targetPricePoints)
    : null;

  const observations = target.salesData.map((s: { weekStartDate: Date; unitsSold: number }) => {
    const weekDeltas = deltas.map((d) => d.delta);
    const avgDelta =
      weekDeltas.length > 0
        ? weekDeltas.reduce((a: number, b: number) => a + b, 0) / weekDeltas.length
        : 0;
    return { weekStartDate: s.weekStartDate, priceDelta: avgDelta, unitsSold: s.unitsSold };
  });

  const regressionModel = fitPriceDeltaRegression(observations);
  const projections = regressionModel ? buildProjections(observations, regressionModel) : [];

  const sentimentInput = target.reviews.map(
    (r: { scrapedAt: Date; sentimentLabel: string | null }) => ({
      scrapedAt: r.scrapedAt,
      sentimentLabel: r.sentimentLabel,
    })
  );
  const wowSentiment = aggregateWoWSentiment(sentimentInput);

  const recommendation = generateRecommendation({
    currentPrice,
    msrp: target.msrp,
    deltas,
    valueScore,
    regressionModel,
    recentSentiment: wowSentiment,
  });

  const payload = {
    target: { id: target.id, name: target.name, msrp: target.msrp, currentPrice },
    deltas,
    valueScore,
    regression: regressionModel
      ? {
          equation: regressionModel.equation,
          r2: regressionModel.r2,
          optimalDelta: regressionModel.optimalDelta,
          optimalUnitsSold: regressionModel.optimalUnitsSold,
        }
      : null,
    projections,
    wowSentiment,
    recommendation,
  };

  await setCached(cacheKey, payload, CACHE_TTL);
  return Response.json(payload);
}
