export const sleep = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, ms));

export function randomDelay(minMs = 500, maxMs = 2000): Promise<void> {
  return sleep(minMs + Math.random() * (maxMs - minMs));
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}
