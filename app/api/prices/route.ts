import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAmazonPriceHistory } from "@/lib/apis/keepa";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const retailer = searchParams.get("retailer");
  const days = parseInt(searchParams.get("days") ?? "30", 10);

  if (!productId) {
    return Response.json({ error: "productId is required." }, { status: 400 });
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const prices = await prisma.price.findMany({
    where: {
      productId,
      scrapedAt: { gte: since },
      ...(retailer ? { retailer } : {}),
    },
    orderBy: { scrapedAt: "asc" },
  });

  return Response.json({ prices });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, asin } = body;

    if (!productId) {
      return Response.json({ error: "productId is required." }, { status: 400 });
    }

    const results = { prices: [] as object[] };

    if (asin) {
      const history = await getAmazonPriceHistory(asin);
      const records = history.newPrice.map((p) => ({
        productId,
        retailer: "Amazon",
        price: p.price,
        scrapedAt: new Date(p.date),
        source: "KEEPA" as const,
      }));

      await prisma.price.createMany({ data: records, skipDuplicates: true });
      results.prices = records;
    }

    return Response.json({ success: true, ...results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
