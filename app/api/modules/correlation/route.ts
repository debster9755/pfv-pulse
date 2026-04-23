import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeCorrelation } from "@/lib/modules/correlation";
import type { SalesRow } from "@/lib/modules/correlation";

export async function GET(req: NextRequest) {
  const product = req.nextUrl.searchParams.get("product");
  if (!product) {
    return NextResponse.json({ error: "product is required" }, { status: 400 });
  }

  try {
    const salesData = await prisma.salesData.findMany({
      where: { product: { name: { contains: product, mode: "insensitive" } } },
      orderBy: { period: "asc" },
      include: {
        product: {
          include: {
            prices: { orderBy: { recordedAt: "desc" }, take: 1 },
          },
        },
      },
    });

    if (salesData.length === 0) {
      return NextResponse.json({
        correlation: null,
        message: "No sales data available. Upload a CSV to enable correlation analysis.",
      });
    }

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

    const correlation = computeCorrelation(rows);
    return NextResponse.json({ correlation, dataPoints: rows.length });
  } catch {
    return NextResponse.json({ correlation: null, message: "Database unavailable." });
  }
}
