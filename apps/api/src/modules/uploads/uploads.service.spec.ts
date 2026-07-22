import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { UploadsService } from "./uploads.service";
import { MediaStatus } from "@eventshare/shared";

function makeTxMock(overrides: Record<string, any> = {}) {
  return {
    $queryRaw: jest.fn(),
    media: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    ...overrides,
  };
}

function makeService(opts: {
  tx?: ReturnType<typeof makeTxMock>;
  prismaOverrides?: Record<string, any>;
  eventOverrides?: Record<string, any>;
}) {
  const tx = opts.tx ?? makeTxMock();
  const prisma = {
    $transaction: jest.fn(async (fn: any) => fn(tx)),
    media: { findFirst: jest.fn() },
    upload: { create: jest.fn(), findFirst: jest.fn() },
    ...opts.prismaOverrides,
  };
  const events = {
    findByToken: jest.fn().mockResolvedValue({
      id: "event-1",
      allowUploads: true,
      expirationMode: "VIEW_ONLY",
      maxUploads: null,
      ...opts.eventOverrides,
    }),
    isExpired: jest.fn().mockReturnValue(false),
  };
  const storage = {
    createPresignedPutUrl: jest.fn().mockResolvedValue({ url: "https://x/put", headers: {} }),
  };
  const jwt = { sign: jest.fn().mockReturnValue("signed-upload-token") };
  const config = {
    get: (key: string) => {
      const values: Record<string, unknown> = {
        "app.maxVideoSizeMb": 500,
        "app.maxImageSizeMb": 50,
        "app.presignedUrlTtlSeconds": 600,
        "app.jwtAccessSecret": "secret",
      };
      return values[key];
    },
  };
  const qstash = { publishMediaJob: jest.fn().mockResolvedValue(undefined) };

  const svc = new UploadsService(
    prisma as any,
    events as any,
    storage as any,
    jwt as any,
    config as any,
    qstash as any,
  );
  return { svc, prisma, events, storage, jwt, qstash, tx };
}

describe("UploadsService.presign", () => {
  it("rejects when uploads are disabled for the event", async () => {
    const { svc } = makeService({ eventOverrides: { allowUploads: false } });
    await expect(
      svc.presign("tok", { filename: "a.jpg", mimeType: "image/jpeg", size: 100 } as any, "1.1.1.1", "ua"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejects oversized files before ever touching the DB", async () => {
    const { svc, tx } = makeService({});
    await expect(
      svc.presign(
        "tok",
        { filename: "a.jpg", mimeType: "image/jpeg", size: 999 * 1024 * 1024 } as any,
        "1.1.1.1",
        "ua",
      ),
    ).rejects.toThrow(/too large/i);
    expect(tx.media.create).not.toHaveBeenCalled();
  });

  it("locks the event row and enforces maxUploads inside the transaction", async () => {
    const tx = makeTxMock();
    tx.media.count.mockResolvedValue(3);
    const { svc } = makeService({ tx, eventOverrides: { maxUploads: 3 } });

    await expect(
      svc.presign("tok", { filename: "a.jpg", mimeType: "image/jpeg", size: 100 } as any, "1.1.1.1", "ua"),
    ).rejects.toThrow(/limit reached/i);

    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.media.create).not.toHaveBeenCalled();
  });

  it("skips the row lock entirely when the event has no upload cap", async () => {
    const tx = makeTxMock();
    tx.media.create.mockResolvedValue({ id: "media-1" });
    const { svc } = makeService({ tx, eventOverrides: { maxUploads: null } });

    await svc.presign("tok", { filename: "a.jpg", mimeType: "image/jpeg", size: 100 } as any, "1.1.1.1", "ua");

    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.media.create).toHaveBeenCalled();
  });
});

describe("UploadsService.complete", () => {
  const baseDto = { mediaId: "media-1", uploadToken: "raw-token" } as any;

  it("throws NotFoundException when the media row doesn't exist", async () => {
    const { svc, prisma } = makeService({});
    prisma.media.findFirst.mockResolvedValue(null);
    await expect(svc.complete("tok", baseDto)).rejects.toThrow(NotFoundException);
  });

  it("is idempotent: replaying complete() on an already-completed media returns its current state without re-checking the token", async () => {
    const { svc, prisma } = makeService({});
    prisma.media.findFirst.mockResolvedValue({
      id: "media-1",
      status: MediaStatus.READY,
      eventId: "event-1",
      type: "IMAGE",
    });

    const result = await svc.complete("tok", baseDto);

    expect(result).toEqual({ mediaId: "media-1", status: MediaStatus.READY });
    expect(prisma.upload.findFirst).not.toHaveBeenCalled();
  });

  it("rejects an invalid upload token", async () => {
    const { svc, prisma } = makeService({});
    prisma.media.findFirst.mockResolvedValue({
      id: "media-1",
      status: MediaStatus.PENDING_UPLOAD,
      eventId: "event-1",
      type: "IMAGE",
    });
    prisma.upload.findFirst.mockResolvedValue(null);

    await expect(svc.complete("tok", baseDto)).rejects.toThrow(ForbiddenException);
  });

  it("detects a duplicate by checksum, soft-deletes the new row, and does not publish a job", async () => {
    const tx = makeTxMock();
    tx.media.findFirst.mockResolvedValue({ id: "existing-media", status: MediaStatus.READY });
    const { svc, prisma, qstash } = makeService({ tx });
    prisma.media.findFirst.mockResolvedValue({
      id: "media-1",
      status: MediaStatus.PENDING_UPLOAD,
      eventId: "event-1",
      type: "IMAGE",
    });
    prisma.upload.findFirst.mockResolvedValue({ id: "upload-1" });

    const result = await svc.complete("tok", { ...baseDto, checksumSha256: "abc123" });

    expect(result).toEqual({ mediaId: "existing-media", status: MediaStatus.READY });
    expect(tx.media.update).toHaveBeenCalledWith({
      where: { id: "media-1" },
      data: { status: MediaStatus.DELETED, deletedAt: expect.any(Date) },
    });
    expect(qstash.publishMediaJob).not.toHaveBeenCalled();
  });

  it("wins the atomic claim on the happy path and publishes exactly one job", async () => {
    const tx = makeTxMock();
    tx.media.findFirst.mockResolvedValue(null); // no duplicate
    tx.media.updateMany.mockResolvedValue({ count: 1 });
    const { svc, prisma, qstash } = makeService({ tx });
    prisma.media.findFirst.mockResolvedValue({
      id: "media-1",
      status: MediaStatus.PENDING_UPLOAD,
      eventId: "event-1",
      type: "IMAGE",
      storageKey: "k1",
      mimeType: "image/jpeg",
    });
    prisma.upload.findFirst.mockResolvedValue({ id: "upload-1" });

    const result = await svc.complete("tok", baseDto);

    expect(result).toEqual({ mediaId: "media-1", status: MediaStatus.UPLOADED });
    expect(qstash.publishMediaJob).toHaveBeenCalledTimes(1);
  });

  it("loses a concurrent claim race gracefully: no job published, current status returned", async () => {
    const tx = makeTxMock();
    tx.media.findFirst.mockResolvedValue(null);
    tx.media.updateMany.mockResolvedValue({ count: 0 }); // another concurrent call already won
    tx.media.findUnique.mockResolvedValue({ id: "media-1", status: MediaStatus.UPLOADED });
    const { svc, prisma, qstash } = makeService({ tx });
    prisma.media.findFirst.mockResolvedValue({
      id: "media-1",
      status: MediaStatus.PENDING_UPLOAD,
      eventId: "event-1",
      type: "IMAGE",
    });
    prisma.upload.findFirst.mockResolvedValue({ id: "upload-1" });

    const result = await svc.complete("tok", baseDto);

    expect(result).toEqual({ mediaId: "media-1", status: MediaStatus.UPLOADED });
    expect(qstash.publishMediaJob).not.toHaveBeenCalled();
  });
});
