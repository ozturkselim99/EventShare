import { ConcurrencyLimiter } from "@eventshare/shared";

describe("ConcurrencyLimiter", () => {
  it("never runs more than `max` tasks concurrently", async () => {
    const limiter = new ConcurrencyLimiter(2);
    let concurrentNow = 0;
    let maxObserved = 0;

    const task = () =>
      limiter.run(async () => {
        concurrentNow++;
        maxObserved = Math.max(maxObserved, concurrentNow);
        await new Promise((r) => setTimeout(r, 20));
        concurrentNow--;
      });

    await Promise.all([task(), task(), task(), task(), task(), task()]);

    expect(maxObserved).toBeLessThanOrEqual(2);
  });

  it("releases the slot even when a task throws, so later tasks still run", async () => {
    const limiter = new ConcurrencyLimiter(1);

    await expect(
      limiter.run(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    const result = await limiter.run(async () => "still works");
    expect(result).toBe("still works");
  });

  it("runs tasks in FIFO order once slots free up", async () => {
    const limiter = new ConcurrencyLimiter(1);
    const order: number[] = [];

    const makeTask = (id: number) =>
      limiter.run(async () => {
        await new Promise((r) => setTimeout(r, 5));
        order.push(id);
      });

    await Promise.all([makeTask(1), makeTask(2), makeTask(3)]);

    expect(order).toEqual([1, 2, 3]);
  });
});
