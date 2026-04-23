import { NextRequest, NextResponse } from "next/server";
import { fetchAggregatedReviews } from "@/lib/modules/reviews";

export async function GET(req: NextRequest) {
  const product = req.nextUrl.searchParams.get("product");
  if (!product) {
    return NextResponse.json({ error: "product is required" }, { status: 400 });
  }

  const reviews = await fetchAggregatedReviews(product);
  return NextResponse.json({ reviews, count: reviews.length, product });
}
