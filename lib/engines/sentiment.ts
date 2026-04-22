// Keyword-based valence scorer (Option A — no external API needed).
// Positive/negative wordlists drawn from academic LIWC and Bing Liu lexicons.

const POSITIVE_TERMS = new Set([
  "excellent", "outstanding", "superb", "fantastic", "amazing", "great",
  "good", "impressive", "smooth", "fast", "powerful", "efficient",
  "reliable", "durable", "solid", "bright", "vivid", "quiet", "cool",
  "best", "love", "loved", "perfect", "wonderful", "recommended",
  "value", "worth", "top", "premium", "sleek", "light", "thin",
  "responsive", "accurate", "crisp", "stunning", "exceptional",
  "satisfied", "happy", "pleased", "wins", "winner",
]);

const NEGATIVE_TERMS = new Set([
  "bad", "poor", "terrible", "awful", "horrible", "worst", "hate",
  "slow", "laggy", "hot", "loud", "noisy", "dim", "blurry", "cheap",
  "flimsy", "fragile", "disappointing", "disappoints", "disappointed",
  "overpriced", "expensive", "overheats", "throttle", "throttling",
  "crash", "crashes", "broken", "defective", "failure", "fails",
  "uncomfortable", "heavy", "bulky", "mediocre", "average",
  "waste", "regret", "return", "returned", "problem", "issues",
]);

export interface SentimentResult {
  score: number;      // -1.0 to 1.0
  label: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  positiveCount: number;
  negativeCount: number;
  totalTokens: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

export function scoreText(text: string): SentimentResult {
  const tokens = tokenize(text);
  let pos = 0;
  let neg = 0;

  for (const token of tokens) {
    if (POSITIVE_TERMS.has(token)) pos++;
    if (NEGATIVE_TERMS.has(token)) neg++;
  }

  const total = pos + neg;
  const score = total === 0 ? 0 : (pos - neg) / total;
  const label: SentimentResult["label"] =
    Math.abs(score) < 0.1 ? "NEUTRAL" : score > 0 ? "POSITIVE" : "NEGATIVE";

  return { score, label, positiveCount: pos, negativeCount: neg, totalTokens: tokens.length };
}

export interface WeekSentiment {
  weekOf: string; // YYYY-MM-DD
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  netScore: number; // (pos - neg) / total
}

export function aggregateWoWSentiment(
  reviews: Array<{ scrapedAt: Date; sentimentLabel: string | null }>
): WeekSentiment[] {
  const byWeek: Record<string, { pos: number; neg: number; neu: number }> = {};

  for (const r of reviews) {
    const weekOf = getWeekStart(r.scrapedAt).toISOString().slice(0, 10);
    byWeek[weekOf] ??= { pos: 0, neg: 0, neu: 0 };
    if (r.sentimentLabel === "POSITIVE") byWeek[weekOf].pos++;
    else if (r.sentimentLabel === "NEGATIVE") byWeek[weekOf].neg++;
    else byWeek[weekOf].neu++;
  }

  return Object.entries(byWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekOf, { pos, neg, neu }]) => {
      const total = pos + neg + neu;
      return {
        weekOf,
        positive: pos,
        negative: neg,
        neutral: neu,
        total,
        netScore: total > 0 ? (pos - neg) / total : 0,
      };
    });
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
