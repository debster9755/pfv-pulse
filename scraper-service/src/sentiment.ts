// Mirrors the main app's sentiment engine — kept in-process to avoid an
// additional HTTP round-trip from the scraper service.

const POSITIVE = new Set([
  "excellent","outstanding","superb","fantastic","amazing","great","good",
  "impressive","smooth","fast","powerful","efficient","reliable","durable",
  "solid","bright","vivid","quiet","cool","best","love","loved","perfect",
  "wonderful","recommended","value","worth","top","premium","sleek","light",
  "thin","responsive","accurate","crisp","stunning","exceptional",
  "satisfied","happy","pleased","wins","winner",
]);

const NEGATIVE = new Set([
  "bad","poor","terrible","awful","horrible","worst","hate","slow","laggy",
  "hot","loud","noisy","dim","blurry","cheap","flimsy","fragile",
  "disappointing","disappoints","disappointed","overpriced","expensive",
  "overheats","throttle","throttling","crash","crashes","broken","defective",
  "failure","fails","uncomfortable","heavy","bulky","mediocre","average",
  "waste","regret","return","returned","problem","issues",
]);

export function scoreText(text: string) {
  const tokens = text.toLowerCase().replace(/[^a-z\s'-]/g, " ").split(/\s+/).filter((t) => t.length > 2);
  let pos = 0;
  let neg = 0;
  for (const t of tokens) {
    if (POSITIVE.has(t)) pos++;
    if (NEGATIVE.has(t)) neg++;
  }
  const total = pos + neg;
  const score = total === 0 ? 0 : (pos - neg) / total;
  const label = Math.abs(score) < 0.1 ? "NEUTRAL" : score > 0 ? "POSITIVE" : "NEGATIVE";
  return { score, label, positiveCount: pos, negativeCount: neg };
}
