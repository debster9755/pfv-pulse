import type { ReviewEntry } from "./reviews";

export interface SentimentResult {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  score: number;
  label: "positive" | "negative" | "neutral";
  weekOverWeekDelta: number | null;
}

const POSITIVE_WORDS = new Set([
  "excellent", "great", "amazing", "fantastic", "outstanding", "superb",
  "brilliant", "impressive", "recommend", "best", "love", "perfect", "solid",
  "fast", "smooth", "reliable", "durable", "powerful", "value", "good",
  "awesome", "incredible", "satisfied", "pleased", "happy", "worth",
]);

const NEGATIVE_WORDS = new Set([
  "bad", "terrible", "awful", "poor", "worst", "disappointing", "avoid",
  "broken", "defective", "slow", "hot", "overheating", "noisy", "cheap",
  "fragile", "unreliable", "regret", "waste", "useless", "frustrating",
  "failure", "returned", "refund", "buggy", "glitch", "problem", "issue",
]);

function scoreText(text: string): "positive" | "negative" | "neutral" {
  const words = text.toLowerCase().split(/\W+/);
  let pos = 0, neg = 0;
  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) pos++;
    if (NEGATIVE_WORDS.has(word)) neg++;
  }
  if (pos === 0 && neg === 0) return "neutral";
  return pos >= neg ? "positive" : "negative";
}

export function analyzeReviewSentiment(
  reviews: ReviewEntry[],
  previousScore?: number
): SentimentResult {
  let positive = 0, negative = 0, neutral = 0;

  for (const review of reviews) {
    const label = scoreText(review.title ?? "");
    if (label === "positive") positive++;
    else if (label === "negative") negative++;
    else neutral++;
  }

  const total = reviews.length;
  const rawScore = total > 0 ? (positive - negative) / total : 0;
  const score = Math.round(rawScore * 100) / 100;

  let label: "positive" | "negative" | "neutral" = "neutral";
  if (score > 0.1) label = "positive";
  else if (score < -0.1) label = "negative";

  const weekOverWeekDelta =
    previousScore != null
      ? Math.round((score - previousScore) * 100) / 100
      : null;

  return { positive, negative, neutral, total, score, label, weekOverWeekDelta };
}
