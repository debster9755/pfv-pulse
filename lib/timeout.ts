/**
 * Race a promise against a timeout. Returns fallback if timeout fires first.
 * Uses setTimeout (not AbortSignal.timeout) which works reliably in all
 * Node.js runtimes including Vercel serverless.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T
): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      () => { clearTimeout(timer); resolve(fallback); }
    );
  });
}
