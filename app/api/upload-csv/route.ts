import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";

interface CsvRow {
  product_name?: string;
  brand?: string;
  period?: string;
  units_sold?: string;
  revenue?: string;
  region?: string;
  channel?: string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const text = await file.text();
    const parsed = Papa.parse<CsvRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
    });

    if (parsed.errors.length > 0) {
      return NextResponse.json(
        { error: "CSV parse error", details: parsed.errors.slice(0, 5) },
        { status: 422 }
      );
    }

    const rows = parsed.data;
    let ingested = 0;
    const skipped: string[] = [];

    for (const row of rows) {
      const name = row.product_name?.trim();
      const brand = row.brand?.trim() ?? "Unknown";
      const period = row.period?.trim();
      const unitsSold = parseInt(row.units_sold ?? "", 10);
      const revenue = parseFloat(row.revenue ?? "");

      if (!name || !period || isNaN(unitsSold) || isNaN(revenue)) {
        skipped.push(`Row missing required fields: ${JSON.stringify(row)}`);
        continue;
      }

      const periodDate = new Date(period);
      if (isNaN(periodDate.getTime())) {
        skipped.push(`Invalid date: ${period}`);
        continue;
      }

      try {
        let product = await prisma.product.findFirst({
          where: { name: { equals: name, mode: "insensitive" } },
        });

        if (!product) {
          product = await prisma.product.create({
            data: { name, brand, model: name, category: "laptop" },
          });
        }

        await prisma.salesData.create({
          data: {
            productId: product.id,
            period: periodDate,
            unitsSold,
            revenue,
            region: row.region?.trim() ?? null,
            channel: row.channel?.trim() ?? null,
            source: "csv_upload",
          },
        });
        ingested++;
      } catch {
        skipped.push(`DB error for row: ${name}`);
      }
    }

    return NextResponse.json({
      success: true,
      ingested,
      skipped: skipped.length,
      skippedDetails: skipped.slice(0, 10),
    });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
