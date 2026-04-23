import regression from "regression";

export interface SalesRow {
  period: string;
  unitsSold: number;
  revenue: number;
  price?: number;
  sentimentScore?: number;
}

export interface CorrelationResult {
  priceToSalesR2: number | null;
  sentimentToSalesR2: number | null;
  priceTrendSlope: number | null;
  projectedNextWeekUnits: number | null;
  dataPoints: number;
}

function pearsonR2(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const result = regression.linear(xs.map((x, i) => [x, ys[i]]));
  return Math.round(result.r2 * 1000) / 1000;
}

export function computeCorrelation(rows: SalesRow[]): CorrelationResult {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.period).getTime() - new Date(b.period).getTime()
  );

  const units = sorted.map((r) => r.unitsSold);
  const prices = sorted.map((r) => r.price ?? null).filter((p): p is number => p !== null);
  const sentiments = sorted
    .map((r) => r.sentimentScore ?? null)
    .filter((s): s is number => s !== null);

  const priceToSalesR2 =
    prices.length >= 3
      ? pearsonR2(prices, sorted.filter((r) => r.price != null).map((r) => r.unitsSold))
      : null;

  const sentimentToSalesR2 =
    sentiments.length >= 3
      ? pearsonR2(
          sentiments,
          sorted.filter((r) => r.sentimentScore != null).map((r) => r.unitsSold)
        )
      : null;

  let priceTrendSlope: number | null = null;
  let projectedNextWeekUnits: number | null = null;

  if (units.length >= 3) {
    const indexed: [number, number][] = units.map((u, i) => [i, u]);
    const fit = regression.linear(indexed);
    priceTrendSlope = Math.round(fit.equation[0] * 100) / 100;
    projectedNextWeekUnits = Math.max(
      0,
      Math.round(fit.predict(units.length)[1])
    );
  }

  return {
    priceToSalesR2,
    sentimentToSalesR2,
    priceTrendSlope,
    projectedNextWeekUnits,
    dataPoints: sorted.length,
  };
}
