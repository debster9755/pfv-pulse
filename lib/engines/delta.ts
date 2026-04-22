export interface PricePoint {
  productId: string;
  productName: string;
  retailer: string;
  price: number;
}

export interface DeltaRow {
  competitorId: string;
  competitorName: string;
  retailer: string;
  competitorPrice: number;
  targetPrice: number;
  delta: number;        // competitor - target (negative = target is cheaper)
  deltaPercent: number;
  verdict: "cheaper" | "parity" | "expensive";
}

export interface ValueScore {
  productId: string;
  aggregateBenchmark: number;
  lowestMarketPrice: number;
  valueScore: number; // benchmark / price * 100
}

export function calculateDeltas(
  targetPrices: PricePoint[],
  competitorPrices: PricePoint[]
): DeltaRow[] {
  if (targetPrices.length === 0) return [];

  // Use the lowest target price across all retailers
  const targetLowest = Math.min(...targetPrices.map((p) => p.price));
  const target = targetPrices.find((p) => p.price === targetLowest)!;

  const rows: DeltaRow[] = [];

  const grouped = groupBy(competitorPrices, (p) => `${p.productId}:${p.retailer}`);

  for (const [, group] of Object.entries(grouped)) {
    const comp = group.reduce((a, b) => (a.price < b.price ? a : b));
    const delta = comp.price - targetLowest;
    const deltaPercent = targetLowest > 0 ? (delta / targetLowest) * 100 : 0;

    rows.push({
      competitorId: comp.productId,
      competitorName: comp.productName,
      retailer: comp.retailer,
      competitorPrice: comp.price,
      targetPrice: targetLowest,
      delta,
      deltaPercent,
      verdict:
        Math.abs(deltaPercent) < 1
          ? "parity"
          : delta < 0
          ? "cheaper"
          : "expensive",
    });
  }

  return rows.sort((a, b) => a.delta - b.delta);
}

export function calculateValueScore(
  productId: string,
  aggregateBenchmark: number,
  allPrices: PricePoint[]
): ValueScore {
  const productPrices = allPrices.filter((p) => p.productId === productId);
  const lowestMarketPrice =
    productPrices.length > 0
      ? Math.min(...productPrices.map((p) => p.price))
      : 0;

  const valueScore =
    lowestMarketPrice > 0 ? (aggregateBenchmark / lowestMarketPrice) * 100 : 0;

  return { productId, aggregateBenchmark, lowestMarketPrice, valueScore };
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    (acc[k] ??= []).push(item);
    return acc;
  }, {});
}
