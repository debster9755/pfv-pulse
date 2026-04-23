import { NextRequest, NextResponse } from "next/server";
import { fetchAggregatedReviews } from "@/lib/modules/reviews";
import { analyzeReviewSentiment } from "@/lib/modules/sentiment";

export async function GET(req: NextRequest) {
  const product = req.nextUrl.searchParams.get("product");
  const previousScore = req.nextUrl.searchParams.get("previousScore");

  if (!product) {
    return NextResponse.json({ error: "product is required" }, { status: 400 });
  }

  const reviews = await fetchAggregatedReviews(product);
  const prevScore = previousScore ? parseFloat(previousScore) : undefined;
  const sentiment = analyzeReviewSentiment(reviews, prevScore);

  return NextResponse.json({ sentiment, reviewCount: reviews.length, product });
}
