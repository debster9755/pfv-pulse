type QueuedCall<T> = {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (err: unknown) => void;
};

/**
 * Token-bucket throttle for external API calls.
 * Ensures at most `maxPerWindow` calls fire within any `windowMs` interval.
 */
export class ApiThrottle {
  private queue: QueuedCall<unknown>[] = [];
  private timestamps: number[] = [];
  private running = false;

  constructor(
    private readonly maxPerWindow: number,
    private readonly windowMs: number
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject } as QueuedCall<unknown>);
      if (!this.running) this.drain();
    });
  }

  private async drain() {
    this.running = true;
    while (this.queue.length > 0) {
      const now = Date.now();
      this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

      if (this.timestamps.length >= this.maxPerWindow) {
        const wait = this.windowMs - (now - this.timestamps[0]);
        await sleep(wait > 0 ? wait : 0);
        continue;
      }

      const item = this.queue.shift()!;
      this.timestamps.push(Date.now());
      item.fn().then(item.resolve).catch(item.reject);
    }
    this.running = false;
  }
}

export const sleep = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, ms));

// Shared throttle instances — SerpApi: 100/hr, Keepa: 5/min, BestBuy: 5/sec
export const serpThrottle = new ApiThrottle(100, 60 * 60 * 1000);
export const keepaThrottle = new ApiThrottle(5, 60 * 1000);
export const bestBuyThrottle = new ApiThrottle(5, 1000);
