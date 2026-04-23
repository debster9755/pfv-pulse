import { NextRequest, NextResponse } from "next/server";
import { parseIntent } from "@/lib/intent/router";
import { searchBestBuyProducts } from "@/lib/api/bestbuy";
import { getShoppingPrices } from "@/lib/api/serpapi";

// Stay within Vercel hobby tier 10s limit
export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const intent = parseIntent(message);

    // Intent parsing is instant — return clarifications immediately
    if (intent.type === "clarification_needed") {
      return NextResponse.json({
        type: "clarification",
        message: intent.clarificationPrompt,
      });
    }

    if (intent.type === "price_history") {
      const query = intent.products[0] ?? intent.brands[0] ?? message;
      return NextResponse.json({
        type: "redirect",
        message: `Showing 30-day price history for **${query}**.`,
        historyQuery: query,
      });
    }

    if (intent.type === "recommendation") {
      return NextResponse.json({
        type: "redirect",
        message: "Opening the Revenue-Boost Recommendation Engine…",
        redirectTo: "recommendation",
      });
    }

    if (intent.type === "unknown") {
      return NextResponse.json({
        type: "clarification",
        message:
          "I'm not sure what you're looking for. Try:\n- *\"Give me HP Omen laptop pricing options\"*\n- *\"Compare HP Omen vs Lenovo Legion vs Asus ROG\"*\n- *\"Show price history for HP Omen 16\"*",
      });
    }

    // ── single_product: Best Buy only (fast, ~1-3s) ──────────────────────────
    if (intent.type === "single_product") {
      const query = intent.products[0] ?? intent.brands[0] ?? message;

      const bbData = await searchBestBuyProducts(query, 8);
      // SerpApi market context is fetched client-side via /api/prices separately
      const chartData = bbData.map((p) => ({
        name: p.name.length > 40 ? p.name.slice(0, 37) + "…" : p.name,
        regularPrice: p.regularPrice,
        salePrice: p.salePrice,
        retailer: "Best Buy",
        url: p.url,
      }));

      return NextResponse.json({
        type: "single_product",
        intent,
        chart: chartData,
        serpSummary: null,   // client fetches this separately from /api/prices
        dataAvailable: chartData.length > 0,
        query,
      });
    }

    // ── comparison: SerpApi × N brands in parallel ────────────────────────────
    if (intent.type === "comparison") {
      const targets = intent.products.length ? intent.products : intent.brands;

      const priceResults = await Promise.allSettled(
        targets.map((t) => getShoppingPrices(t))
      );

      const rows = targets.map((target, i) => {
        const summary =
          priceResults[i].status === "fulfilled"
            ? priceResults[i].value
            : { average: null, low: null, high: null };
        return { brand: target, average: summary.average, low: summary.low, high: summary.high };
      });

      const hpRow = rows.find((r) => /\bhp\b/i.test(r.brand));
      const hpAvg = hpRow?.average ?? null;

      const tableData = rows.map((r) => ({
        ...r,
        priceDeltaVsHp:
          hpAvg != null && r.average != null && r.brand !== hpRow?.brand
            ? Math.round(((r.average - hpAvg) / hpAvg) * 10000) / 100
            : null,
      }));

      return NextResponse.json({
        type: "comparison",
        intent,
        table: tableData,
        dataAvailable: tableData.some((r) => r.average !== null),
      });
    }

    return NextResponse.json({
      type: "clarification",
      message: "Could you be more specific? Try asking for HP Omen pricing options or a comparison between brands.",
    });
  } catch {
    return NextResponse.json(
      { type: "error", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
