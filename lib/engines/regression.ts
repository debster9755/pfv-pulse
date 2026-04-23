import regression from "regression";

export interface SalesObservation {
  weekStartDate: Date;
  priceDelta: number; // competitor_price - target_price
  unitsSold: number;
}

export interface RegressionResult {
  equation: [number, number]; // [slope, intercept]
  r2: number;
  predictedUnitsAtDelta: (delta: number) => number;
  optimalDelta: number;
  optimalUnitsSold: number;
  dataPoints: number;
}

export interface SalesProjection {
  weekStartDate: string;
  actual: number;
  projected: number;
}

/**
 * Fits a linear regression: unitsSold ~ priceDelta
 * Returns a function to predict units at any given delta.
 */
export function fitPriceDeltaRegression(
  observations: SalesObservation[]
): RegressionResult | null {
  if (observations.length < 3) return null;

  const points: [number, number][] = observations.map((o) => [
    o.priceDelta,
    o.unitsSold,
  ]);

  const result = regression.linear(points, { precision: 4 });
  const [slope, intercept] = result.equation;
  const r2 = result.r2;

  // Optimal delta: price where units are maximised (within observed range)
  const deltas = observations.map((o) => o.priceDelta);
  const minDelta = Math.min(...deltas);
  const maxDelta = Math.max(...deltas);

  let optimalDelta = minDelta;
  let optimalUnits = -Infinity;
  for (let d = minDelta; d <= maxDelta; d += 0.5) {
    const predicted = slope * d + intercept;
    if (predicted > optimalUnits) {
      optimalUnits = predicted;
      optimalDelta = d;
    }
  }

  return {
    equation: [slope, intercept],
    r2,
    predictedUnitsAtDelta: (delta: number) =>
      Math.max(0, slope * delta + intercept),
    optimalDelta,
    optimalUnitsSold: Math.max(0, optimalUnits),
    dataPoints: observations.length,
  };
}

export function buildProjections(
  observations: SalesObservation[],
  model: RegressionResult
): SalesProjection[] {
  return observations.map((o) => ({
    weekStartDate: o.weekStartDate.toISOString().slice(0, 10),
    actual: o.unitsSold,
    projected: Math.round(model.predictedUnitsAtDelta(o.priceDelta)),
  }));
}
