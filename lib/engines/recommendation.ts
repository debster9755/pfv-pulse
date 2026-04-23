import type { DeltaRow, ValueScore } from "./delta";
import type { RegressionResult } from "./regression";
import type { WeekSentiment } from "./sentiment";

export type RecommendationAction = "LOWER_PRICE" | "RAISE_PRICE" | "HOLD";

export interface Reason {
  weight: "high" | "medium" | "low";
  text: string;
}

export interface PricingRecommendation {
  action: RecommendationAction;
  shouldAct: boolean;
  currentPrice: number;
  suggestedPrice: number;
  changePercent: number;
  confidence: number; // 0-1
  reasons: Reason[]; // top 3
  generatedAt: string;
}

interface RecommendationInputs {
  currentPrice: number;
  msrp: number;
  deltas: DeltaRow[];
  valueScore: ValueScore | null;
  regressionModel: RegressionResult | null;
  recentSentiment: WeekSentiment[];
}

export function generateRecommendation(
  inputs: RecommendationInputs
): PricingRecommendation {
  const {
    currentPrice,
    msrp,
    deltas,
    valueScore,
    regressionModel,
    recentSentiment,
  } = inputs;

  const signals: Array<{ score: number; reason: Reason }> = [];

  // ── Signal 1: Competitive delta ──────────────────────────────────────────
  if (deltas.length > 0) {
    const avgDelta =
      deltas.reduce((s, d) => s + d.delta, 0) / deltas.length;
    const cheaperCount = deltas.filter((d) => d.verdict === "cheaper").length;
    const pct = (cheaperCount / deltas.length) * 100;

    if (avgDelta < -25) {
      signals.push({
        score: -0.6,
        reason: {
          weight: "high",
          text: `${cheaperCount} of ${deltas.length} competitors (${pct.toFixed(0)}%) are priced below you by an average of $${Math.abs(avgDelta).toFixed(0)}. Significant downward price pressure exists in the market.`,
        },
      });
    } else if (avgDelta > 25) {
      signals.push({
        score: 0.5,
        reason: {
          weight: "high",
          text: `Competitors average $${avgDelta.toFixed(0)} higher than your current price — you have headroom to raise price without losing competitive position.`,
        },
      });
    } else {
      signals.push({
        score: 0,
        reason: {
          weight: "medium",
          text: `Market pricing is at near-parity (avg delta $${avgDelta.toFixed(0)}). Current price is competitively positioned — hold unless sentiment or sales signal otherwise.`,
        },
      });
    }
  }

  // ── Signal 2: Regression optimal delta ───────────────────────────────────
  if (regressionModel && regressionModel.r2 > 0.4) {
    const currentDelta =
      deltas.length > 0
        ? deltas.reduce((s, d) => s + d.delta, 0) / deltas.length
        : 0;
    const optDelta = regressionModel.optimalDelta;
    const diff = optDelta - currentDelta;

    if (Math.abs(diff) > 10) {
      const priceSuggestion = currentPrice + diff;
      signals.push({
        score: diff < 0 ? -0.5 : 0.4,
        reason: {
          weight: "high",
          text: `Sales regression model (R²=${regressionModel.r2.toFixed(2)}) projects peak unit volume at a $${optDelta.toFixed(0)} price delta, implying a suggested price of $${priceSuggestion.toFixed(0)}.`,
        },
      });
    } else {
      signals.push({
        score: 0.1,
        reason: {
          weight: "low",
          text: `Regression model (R²=${regressionModel.r2.toFixed(2)}) confirms current pricing delta is near-optimal for unit volume. No regression-based adjustment needed.`,
        },
      });
    }
  }

  // ── Signal 3: Sentiment trend ─────────────────────────────────────────────
  if (recentSentiment.length >= 2) {
    const last = recentSentiment.at(-1)!;
    const prev = recentSentiment.at(-2)!;
    const wowChange = last.netScore - prev.netScore;

    if (last.netScore < -0.2) {
      signals.push({
        score: -0.35,
        reason: {
          weight: "medium",
          text: `Review sentiment is net-negative this week (score ${(last.netScore * 100).toFixed(0)}%). A price reduction may partially offset negative consumer perception while waiting for product improvements.`,
        },
      });
    } else if (wowChange > 0.15) {
      signals.push({
        score: 0.3,
        reason: {
          weight: "medium",
          text: `Sentiment improved +${(wowChange * 100).toFixed(0)}% week-on-week (now ${(last.netScore * 100).toFixed(0)}%). Positive momentum supports holding or modestly raising price.`,
        },
      });
    } else {
      signals.push({
        score: 0.05,
        reason: {
          weight: "low",
          text: `Sentiment is stable (WoW change: ${(wowChange * 100).toFixed(1)}%). No sentiment-based pricing adjustment warranted.`,
        },
      });
    }
  }

  // ── Signal 4: Value score ─────────────────────────────────────────────────
  if (valueScore) {
    if (valueScore.valueScore < 10) {
      signals.push({
        score: -0.25,
        reason: {
          weight: "medium",
          text: `Value score of ${valueScore.valueScore.toFixed(1)} is below market average — benchmark performance relative to price is weak. A price cut improves perceived value-for-money.`,
        },
      });
    } else if (valueScore.valueScore > 20) {
      signals.push({
        score: 0.2,
        reason: {
          weight: "low",
          text: `Strong value score of ${valueScore.valueScore.toFixed(1)} — this product outperforms on benchmark-per-dollar vs. competitors. Supports holding or slight price increase.`,
        },
      });
    }
  }

  // ── Aggregate & decide ────────────────────────────────────────────────────
  const totalScore =
    signals.reduce((s, sig) => s + sig.score, 0) / (signals.length || 1);
  const confidence = Math.min(1, Math.abs(totalScore) * 2);

  let action: RecommendationAction;
  let priceDelta = 0;

  if (totalScore < -0.2) {
    action = "LOWER_PRICE";
    priceDelta = Math.max(-0.15, totalScore * 0.5) * currentPrice;
  } else if (totalScore > 0.25) {
    action = "RAISE_PRICE";
    priceDelta = Math.min(0.1, totalScore * 0.3) * currentPrice;
  } else {
    action = "HOLD";
  }

  const suggestedPrice = Math.max(msrp * 0.7, currentPrice + priceDelta);
  const changePercent =
    currentPrice > 0
      ? ((suggestedPrice - currentPrice) / currentPrice) * 100
      : 0;

  // Top 3 reasons sorted by weight
  const weightOrder = { high: 0, medium: 1, low: 2 };
  const top3 = signals
    .sort(
      (a, b) =>
        weightOrder[a.reason.weight] - weightOrder[b.reason.weight]
    )
    .slice(0, 3)
    .map((s) => s.reason);

  return {
    action,
    shouldAct: action !== "HOLD",
    currentPrice,
    suggestedPrice: parseFloat(suggestedPrice.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    confidence: parseFloat(confidence.toFixed(2)),
    reasons: top3,
    generatedAt: new Date().toISOString(),
  };
}
