import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShoppingPrices } from "@/lib/apis/serpapi";
import { getBestBuyPrices } from "@/lib/apis/bestbuy";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q") ?? "";
  const isTarget = searchParams.get("isTarget");

  const products = await prisma.product.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
              { brand: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(isTarget !== null ? { isTarget: isTarget === "true" } : {}),
    },
    include: {
      prices: { orderBy: { scrapedAt: "desc" }, take: 1 },
      benchmarks: { orderBy: { scrapedAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return Response.json({ products });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, brand, model, sku, msrp, isTarget = false } = body;

    if (!name || !brand || !sku || msrp === undefined) {
      return Response.json(
        { error: "name, brand, sku, and msrp are required." },
        { status: 400 }
      );
    }

    const product = await prisma.product.upsert({
      where: { sku },
      update: { name, brand, model: model ?? "", msrp, isTarget },
      create: {
        name,
        brand,
        model: model ?? "",
        sku,
        msrp,
        isTarget,
        category: body.category ?? "laptop",
      },
    });

    // kick off price enrichment from external APIs
    try {
      const [serpData, bbData] = await Promise.allSettled([
        getShoppingPrices(name),
        getBestBuyPrices(name),
      ]);

      const priceRecords = [];

      if (serpData.status === "fulfilled") {
        for (const r of serpData.value.results.slice(0, 5)) {
          priceRecords.push({
            productId: product.id,
            retailer: r.retailer,
            price: r.price,
            url: r.link,
            source: "SERPAPI" as const,
          });
        }
      }

      if (bbData.status === "fulfilled") {
        for (const p of bbData.value.products.slice(0, 3)) {
          priceRecords.push({
            productId: product.id,
            retailer: "Best Buy",
            price: p.salePrice || p.regularPrice,
            inStock: p.onlineAvailability,
            url: p.url,
            source: "BESTBUY" as const,
          });
        }
      }

      if (priceRecords.length > 0) {
        await prisma.price.createMany({ data: priceRecords });
      }
    } catch {
      // enrichment failure is non-fatal
    }

    return Response.json({ product }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
