import { NextRequest } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";

interface SalesCsvRow {
  sku?: string;
  product_sku?: string;
  retailer?: string;
  week_start_date?: string;
  week_start?: string;
  units_sold?: string;
  revenue?: string;
  avg_selling_price?: string;
  return_rate?: string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return Response.json({ error: "No file uploaded." }, { status: 400 });
    }

    const text = await file.text();

    const { data, errors } = Papa.parse<SalesCsvRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
    });

    if (errors.length > 0 && data.length === 0) {
      return Response.json(
        { error: "CSV parse failed.", details: errors },
        { status: 422 }
      );
    }

    const results = { inserted: 0, skipped: 0, errors: [] as string[] };

    for (const row of data) {
      const sku = (row.sku ?? row.product_sku ?? "").trim();
      const weekRaw = (row.week_start_date ?? row.week_start ?? "").trim();
      const unitsRaw = row.units_sold ?? "0";

      if (!sku || !weekRaw) {
        results.skipped++;
        continue;
      }

      const weekDate = new Date(weekRaw);
      if (isNaN(weekDate.getTime())) {
        results.errors.push(`Invalid date "${weekRaw}" for SKU ${sku}`);
        results.skipped++;
        continue;
      }

      const product = await prisma.product.findUnique({ where: { sku } });
      if (!product) {
        results.errors.push(`SKU not found: ${sku}`);
        results.skipped++;
        continue;
      }

      const retailer = (row.retailer ?? "").trim() || "unknown";
      const unitsSold = parseInt(unitsRaw, 10) || 0;
      const revenue = row.revenue ? parseFloat(row.revenue) : null;
      const avgPrice = row.avg_selling_price
        ? parseFloat(row.avg_selling_price)
        : null;
      const returnRate = row.return_rate ? parseFloat(row.return_rate) : null;

      await prisma.salesData.upsert({
        where: {
          productId_retailer_weekStartDate: {
            productId: product.id,
            retailer,
            weekStartDate: weekDate,
          },
        },
        update: { unitsSold, revenue, avgSellingPrice: avgPrice, returnRate },
        create: {
          productId: product.id,
          retailer,
          weekStartDate: weekDate,
          unitsSold,
          revenue,
          avgSellingPrice: avgPrice,
          returnRate,
        },
      });

      results.inserted++;
    }

    return Response.json({ success: true, ...results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
