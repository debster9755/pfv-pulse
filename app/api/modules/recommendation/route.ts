import { NextRequest, NextResponse } from "next/server";
import { getShoppingPrices } from "@/lib/api/serpapi";
import { fetchAggregatedReviews } from "@/lib/modules/reviews";
import { analyzeReviewSentiment } from "@/lib/modules/sentiment";
import { prisma } from "@/lib/prisma";
import { computeCorrelation } from "@/lib/modules/correlation";
import { generateRecommendation } from "@/lib/modules/recommendation";
import type { SalesRow } from "@/lib/modules/correlation";

export async function GET(req: NextRequest) {
  const product = req.nextUrl.searchParams.get("product") ?? "HP Omen 16";
  const reviewsEnabled = req.nextUrl.searchParams.get("reviews") !== "false";
  const sentimentEnabled = req.nextUrl.searchParams.get("sentiment") !== "false";
  const correlationEnabled = req.nextUrl.searchParams.get("correlation") !== "false";
  const competitors = (req.nextUrl.searchParams.get("competitors") ?? "Lenovo Legion,Asus ROG")
    .split(",")
    .map((c) => c.trim());

  const modulesEnabled = {
    reviews: reviewsEnabled,
    sentiment: sentimentEnabled,
    correlation: correlationEnabled,
  };

  const [hpPrices, ...competitorPriceResults] = await Promise.allSettled([
    getShoppingPrices(product),
    ...competitors.map((c) => getShoppingPrices(c)),
  ]);

  const currentPrice =
    hpPrices.status === "fulfilled" ? hpPrices.value.average : null;

  const competitorPrices = competitors
    .map((brand, i) => {
      const r = competitorPriceResults[i];
      const avg = r.status === "fulfilled" ? r.value.average : null;
      return avg != null ? { brand, price: avg } : null;
    })
    .filter((c): c is { brand: string; price: number } => c !== null);

  let sentiment = null;
  if (sentimentEnabled) {
    const reviews = reviewsEnabled ? await fetchAggregatedReviews(product) : [];
    sentiment = analyzeReviewSentiment(reviews);
  }

  let correlation = null;
  if (correlationEnabled) {
    try {
      const salesData = await prisma.salesData.findMany({
        where: { product: { name: { contains: product, mode: "insensitive" } } },
        orderBy: { period: "asc" },
        include: { product: { include: { prices: { orderBy: { recordedAt: "desc" }, take: 1 } } } },
      });
      if (salesData.length >= 3) {
        const rows: SalesRow[] = salesData.map((s: {
          period: Date;
          unitsSold: number;
          revenue: number;
          product: { prices: { price: number }[] };
        }) => ({
          period: s.period.toISOString(),
          unitsSold: s.unitsSold,
          revenue: s.revenue,
          price: s.product.prices[0]?.price ?? undefined,
        }));
        correlation = computeCorrelation(rows);
      }
    } catch {
      // DB unavailable — proceed without correlation
    }
  }

  const recommendation = generateRecommendation({
    currentPrice,
    competitorPrices,
    sentiment,
    correlation,
    modulesEnabled,
  });

  return NextResponse.json({ recommendation, product, currentPrice, competitorPrices });
}
