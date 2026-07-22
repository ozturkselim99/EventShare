import { NotFoundException } from "@nestjs/common";
import { MediaService } from "./media.service";
import { MediaStatus } from "@eventshare/shared";

function makeService(findManyResult: any[] = []) {
  const prisma = {
    media: { findMany: jest.fn().mockResolvedValue(findManyResult) },
  };
  const storage = {};
  const svc = new MediaService(prisma as any, storage as any);
  return { svc, prisma };
}

function item(id: string, createdAt: string) {
  return {
    id,
    type: "IMAGE",
    thumbnailUrl: null,
    originalUrl: null,
    uploadedBy: null,
    createdAt: new Date(createdAt),
    width: null,
    height: null,
    durationSeconds: null,
  };
}

describe("MediaService cursor pagination", () => {
  it("encodes and decodes a cursor round-trip", () => {
    const { svc } = makeService();
    const date = new Date("2026-01-15T10:30:00.000Z");
    const encoded = (svc as any).encodeCursor(date, "media-id-123");
    const decoded = (svc as any).decodeCursor(encoded);

    expect(decoded.id).toBe("media-id-123");
    expect(decoded.createdAt.toISOString()).toBe(date.toISOString());
  });

  it("throws on a malformed cursor instead of letting a bad query through", () => {
    const { svc } = makeService();
    expect(() => (svc as any).decodeCursor("not-a-real-cursor")).toThrow(NotFoundException);
  });

  it("queries without a cursor filter on the first page", async () => {
    const { svc, prisma } = makeService([item("a", "2026-01-15T10:00:00.000Z")]);
    await svc.findByEvent("event-1", {});

    const call = prisma.media.findMany.mock.calls[0][0];
    expect(call.where).not.toHaveProperty("OR");
    expect(call.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
  });

  it("builds a compound (createdAt, id) keyset filter from the cursor — not id alone", async () => {
    const { svc, prisma } = makeService([]);
    const cursor = (svc as any).encodeCursor(new Date("2026-01-15T10:00:00.000Z"), "media-x");

    await svc.findByEvent("event-1", { cursor });

    const call = prisma.media.findMany.mock.calls[0][0];
    expect(call.where.OR).toEqual([
      { createdAt: { lt: new Date("2026-01-15T10:00:00.000Z") } },
      { createdAt: new Date("2026-01-15T10:00:00.000Z"), id: { lt: "media-x" } },
    ]);
  });

  it("flips the comparison direction for sort=oldest", async () => {
    const { svc, prisma } = makeService([]);
    const cursor = (svc as any).encodeCursor(new Date("2026-01-15T10:00:00.000Z"), "media-x");

    await svc.findByEvent("event-1", { cursor, sort: "oldest" });

    const call = prisma.media.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual([{ createdAt: "asc" }, { id: "asc" }]);
    expect(call.where.OR).toEqual([
      { createdAt: { gt: new Date("2026-01-15T10:00:00.000Z") } },
      { createdAt: new Date("2026-01-15T10:00:00.000Z"), id: { gt: "media-x" } },
    ]);
  });

  it("returns a nextCursor that decodes back to the last item on the page, and null when there's no more data", async () => {
    const items = [
      item("a", "2026-01-15T10:03:00.000Z"),
      item("b", "2026-01-15T10:02:00.000Z"),
      item("c", "2026-01-15T10:01:00.000Z"), // extra row proving hasMore
    ];
    const { svc } = makeService(items);

    const page = await svc.findByEvent("event-1", { limit: 2 });

    expect(page.data.map((d) => d.id)).toEqual(["a", "b"]);
    expect(page.hasMore).toBe(true);
    const decoded = (svc as any).decodeCursor(page.nextCursor);
    expect(decoded.id).toBe("b");

    const { svc: svc2 } = makeService(items.slice(0, 2));
    const lastPage = await svc2.findByEvent("event-1", { limit: 2 });
    expect(lastPage.hasMore).toBe(false);
    expect(lastPage.nextCursor).toBeNull();
  });

  it("only returns READY, non-deleted media for the requested event", async () => {
    const { svc, prisma } = makeService([]);
    await svc.findByEvent("event-1", {});
    const call = prisma.media.findMany.mock.calls[0][0];
    expect(call.where).toMatchObject({
      eventId: "event-1",
      status: MediaStatus.READY,
      deletedAt: null,
    });
  });
});
