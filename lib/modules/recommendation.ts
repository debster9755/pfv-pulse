import type { SentimentResult } from "./sentiment";
import type { CorrelationResult } from "./correlation";

export interface RecommendationResult {
  action: "YES" | "NO" | "HOLD";
  suggestedPrice: number | null;
  currentPrice: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
  dataQualityNote: string | null;
}

interface RecommendationInput {
  currentPrice: number | null;
  competitorPrices: { brand: string; price: number }[];
  sentiment: SentimentResult | null;
  correlation: CorrelationResult | null;
  modulesEnabled: {
    reviews: boolean;
    sentiment: boolean;
    correlation: boolean;
  };
}

export function generateRecommendation(
  input: RecommendationInput
): RecommendationResult {
  const { currentPrice, competitorPrices, sentiment, correlation, modulesEnabled } = input;
  const reasons: string[] = [];
  let action: "YES" | "NO" | "HOLD" = "HOLD";
  let suggestedPrice: number | null = null;
  let confidenceScore = 0;
  let dataSourceCount = 0;

  // --- Competitor price analysis ---
  if (competitorPrices.length > 0 && currentPrice != null) {
    const avgCompetitor =
      competitorPrices.reduce((s, c) => s + c.price, 0) / competitorPrices.length;
    const delta = ((currentPrice - avgCompetitor) / avgCompetitor) * 100;

    if (delta > 5) {
      reasons.push(
        `HP price is ${Math.abs(delta).toFixed(1)}% above competitor average ($${avgCompetitor.toFixed(2)}). Consider a targeted markdown.`
      );
      suggestedPrice = Math.round(avgCompetitor * 0.99 * 100) / 100;
      action = "YES";
      confidenceScore += 2;
    } else if (delta < -5) {
      reasons.push(
        `HP price is ${Math.abs(delta).toFixed(1)}% below competitor average ($${avgCompetitor.toFixed(2)}). Room for a price increase without volume risk.`
      );
      suggestedPrice = Math.round(avgCompetitor * 0.98 * 100) / 100;
      action = "YES";
      confidenceScore += 2;
    } else {
      reasons.push(
        `HP price is within ±5% of competitor average ($${avgCompetitor.toFixed(2)}). Pricing is competitive.`
      );
      confidenceScore += 1;
    }
    dataSourceCount++;
  }

  // --- Sentiment analysis ---
  if (modulesEnabled.sentiment && sentiment != null) {
    dataSourceCount++;
    confidenceScore += 1;

    if (sentiment.label === "positive" && sentiment.score > 0.3) {
      reasons.push(
        `Review sentiment is strongly positive (score: ${sentiment.score}). Positive perception supports a price increase.`
      );
      if (action !== "YES") action = "YES";
      confidenceScore += 1;
    } else if (sentiment.label === "negative") {
      reasons.push(
        `Review sentiment is negative (score: ${sentiment.score}). A price reduction may help recover volume.`
      );
      action = "YES";
      confidenceScore += 1;
    }

    if (sentiment.weekOverWeekDelta != null && Math.abs(sentiment.weekOverWeekDelta) > 0.1) {
      const direction = sentiment.weekOverWeekDelta > 0 ? "improved" : "declined";
      reasons.push(
        `Sentiment WoW has ${direction} by ${Math.abs(sentiment.weekOverWeekDelta * 100).toFixed(0)}%.`
      );
    }
  } else if (modulesEnabled.sentiment) {
    reasons.push("Sentiment module is enabled but no review data was available.");
  }

  // --- Correlation / sales trend ---
  if (modulesEnabled.correlation && correlation != null) {
    dataSourceCount++;
    confidenceScore += 1;

    if (correlation.priceTrendSlope != null) {
      const trend = correlation.priceTrendSlope > 0 ? "upward" : "downward";
      reasons.push(
        `Sales trend is ${trend} (slope: ${correlation.priceTrendSlope} units/period).`
      );
      if (correlation.priceTrendSlope < 0 && action === "HOLD") action = "YES";
    }

    if (correlation.priceToSalesR2 != null) {
      reasons.push(
        `Price-to-sales correlation R² = ${correlation.priceToSalesR2}. ${
          correlation.priceToSalesR2 > 0.6 ? "Strong" : "Moderate"
        } predictive signal.`
      );
      confidenceScore += correlation.priceToSalesR2 > 0.6 ? 1 : 0;
    }
  }

  if (reasons.length === 0) {
    reasons.push("Insufficient data to generate a high-confidence recommendation. Enable more modules or ingest sales data.");
    action = "HOLD";
  }

  const confidence: "HIGH" | "MEDIUM" | "LOW" =
    confidenceScore >= 4 ? "HIGH" : confidenceScore >= 2 ? "MEDIUM" : "LOW";

  const missingModules = Object.entries(modulesEnabled)
    .filter(([, enabled]) => !enabled)
    .map(([m]) => m);

  const dataQualityNote =
    missingModules.length > 0
      ? `Modules disabled: ${missingModules.join(", ")}. Confidence adjusted to ${confidence}.`
      : dataSourceCount === 0
      ? "No external data sources were available. Recommendation is speculative."
      : null;

  return {
    action,
    suggestedPrice: suggestedPrice ?? currentPrice,
    currentPrice,
    confidence,
    reasons: reasons.slice(0, 3),
    dataQualityNote,
  };
}
