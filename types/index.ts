export interface ModuleSettings {
  reviews: boolean;
  sentiment: boolean;
  correlation: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "text" | "chart" | "table" | "clarification" | "error";
  chartData?: PriceChartRow[];
  tableData?: ComparisonRow[];
  serpSummary?: PriceSummary;
}

export interface PriceChartRow {
  name: string;
  regularPrice: number | null;
  salePrice: number | null;
  retailer: string;
  url: string | null;
}

export interface ComparisonRow {
  brand: string;
  average: number | null;
  low: number | null;
  high: number | null;
  priceDeltaVsHp: number | null;
}

export interface PriceSummary {
  results: { title: string; price: number | null; source: string; link: string | null }[];
  low: number | null;
  high: number | null;
  average: number | null;
}

export interface RecommendationData {
  action: "YES" | "NO" | "HOLD";
  suggestedPrice: number | null;
  currentPrice: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
  dataQualityNote: string | null;
}

export interface SentimentData {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  score: number;
  label: "positive" | "negative" | "neutral";
  weekOverWeekDelta: number | null;
}

export interface CorrelationData {
  priceToSalesR2: number | null;
  sentimentToSalesR2: number | null;
  priceTrendSlope: number | null;
  projectedNextWeekUnits: number | null;
  dataPoints: number;
}

export interface HistoryDataPoint {
  date: string;
  price: number;
  retailer?: string;
}
