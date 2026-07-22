// Minimal in-process semaphore shared by the worker (bounds concurrent
// ffmpeg/sharp jobs) and the web app (bounds concurrent upload XHRs). Bounds
// how many async tasks run at once; excess calls queue in-memory and run
// FIFO as slots free up.
export class ConcurrencyLimiter {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}
