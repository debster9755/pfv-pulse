import { NextRequest, NextResponse } from "next/server";
import { parseIntent } from "@/lib/intent/router";
import { searchBestBuyProducts } from "@/lib/api/bestbuy";
import { getShoppingPrices } from "@/lib/api/serpapi";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const intent = parseIntent(message);

    if (intent.type === "clarification_needed") {
      return NextResponse.json({
        type: "clarification",
        message: intent.clarificationPrompt,
      });
    }

    if (intent.type === "single_product") {
      const query = intent.products[0] ?? intent.brands[0] ?? message;
      const [bbResults, serpResults] = await Promise.allSettled([
        searchBestBuyProducts(query, 8),
        getShoppingPrices(query),
      ]);

      const bbData = bbResults.status === "fulfilled" ? bbResults.value : [];
      const serpData =
        serpResults.status === "fulfilled"
          ? serpResults.value
          : { results: [], low: null, high: null, average: null };

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
        serpSummary: serpData,
        dataAvailable: chartData.length > 0 || serpData.results.length > 0,
      });
    }

    if (intent.type === "comparison") {
      const targets = [
        ...intent.products.length ? intent.products : intent.brands,
      ];

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

      const hpRow = rows.find((r) =>
        r.brand.toLowerCase().includes("hp")
      );
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
        message: "Loading the Revenue-Boost Recommendation Engine…",
        redirectTo: "recommendation",
      });
    }

    return NextResponse.json({
      type: "clarification",
      message:
        "I'm not sure what you're looking for. Try:\n- *\"Give me HP Omen laptop pricing options\"*\n- *\"Compare HP Omen vs Lenovo Legion vs Asus ROG\"*\n- *\"Show price history for HP Omen 16\"*",
    });
  } catch {
    return NextResponse.json(
      { type: "error", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
