import { MediaProcessingService } from "./media-processing.service";
import { JobName, MediaStatus } from "@eventshare/shared";

function makePrismaMock() {
  return {
    media: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (fn: any) =>
      fn({ media: { update: jest.fn() }, mediaVariant: { createMany: jest.fn() } }),
    ),
  };
}

function makeConfigMock(overrides: Record<string, unknown> = {}) {
  return { get: (key: string) => overrides[key] };
}

describe("MediaProcessingService", () => {
  const originalStorageProvider = process.env.STORAGE_PROVIDER;

  afterEach(() => {
    process.env.STORAGE_PROVIDER = originalStorageProvider;
    jest.clearAllMocks();
  });

  it("skips processing entirely when the media row no longer exists", async () => {
    const prisma = makePrismaMock();
    prisma.media.findUnique.mockResolvedValue(null);
    const imageService = { process: jest.fn() };
    const videoService = { process: jest.fn() };

    const svc = new MediaProcessingService(
      prisma as any,
      imageService as any,
      videoService as any,
      makeConfigMock() as any,
    );

    await svc.process(JobName.PROCESS_IMAGE, {
      mediaId: "m1",
      eventId: "e1",
      storageKey: "k1",
      mimeType: "image/jpeg",
      type: "IMAGE",
    } as any);

    expect(prisma.media.updateMany).not.toHaveBeenCalled();
    expect(imageService.process).not.toHaveBeenCalled();
  });

  it("does not process a job it lost the atomic claim on (concurrent QStash redelivery)", async () => {
    const prisma = makePrismaMock();
    prisma.media.findUnique.mockResolvedValue({ id: "m1", status: MediaStatus.READY });
    // count: 0 => another delivery already claimed/finished this job
    prisma.media.updateMany.mockResolvedValue({ count: 0 });
    const imageService = { process: jest.fn() };
    const videoService = { process: jest.fn() };

    const svc = new MediaProcessingService(
      prisma as any,
      imageService as any,
      videoService as any,
      makeConfigMock() as any,
    );

    await svc.process(JobName.PROCESS_IMAGE, {
      mediaId: "m1",
      eventId: "e1",
      storageKey: "k1",
      mimeType: "image/jpeg",
      type: "IMAGE",
    } as any);

    expect(imageService.process).not.toHaveBeenCalled();
    expect(videoService.process).not.toHaveBeenCalled();
  });

  it("processes the job when it wins the atomic claim", async () => {
    process.env.STORAGE_PROVIDER = "r2";
    const prisma = makePrismaMock();
    prisma.media.findUnique.mockResolvedValue({ id: "m1", status: MediaStatus.UPLOADED });
    prisma.media.updateMany.mockResolvedValue({ count: 1 });
    const imageService = {
      process: jest.fn().mockResolvedValue({ originalUrl: "https://x/orig.jpg" }),
    };
    const videoService = { process: jest.fn() };

    const svc = new MediaProcessingService(
      prisma as any,
      imageService as any,
      videoService as any,
      makeConfigMock() as any,
    );

    await svc.process(JobName.PROCESS_IMAGE, {
      mediaId: "m1",
      eventId: "e1",
      storageKey: "k1",
      mimeType: "image/jpeg",
      type: "IMAGE",
    } as any);

    expect(imageService.process).toHaveBeenCalledWith("k1", "e1", "m1");
    expect(videoService.process).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("marks the media FAILED and rethrows when processing throws", async () => {
    process.env.STORAGE_PROVIDER = "r2";
    const prisma = makePrismaMock();
    prisma.media.findUnique.mockResolvedValue({ id: "m1", status: MediaStatus.UPLOADED });
    prisma.media.updateMany.mockResolvedValue({ count: 1 });
    const imageService = { process: jest.fn().mockRejectedValue(new Error("sharp exploded")) };
    const videoService = { process: jest.fn() };

    const svc = new MediaProcessingService(
      prisma as any,
      imageService as any,
      videoService as any,
      makeConfigMock() as any,
    );

    await expect(
      svc.process(JobName.PROCESS_IMAGE, {
        mediaId: "m1",
        eventId: "e1",
        storageKey: "k1",
        mimeType: "image/jpeg",
        type: "IMAGE",
      } as any),
    ).rejects.toThrow("sharp exploded");

    expect(prisma.media.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { status: MediaStatus.FAILED },
    });
  });

  it("respects the configured video concurrency limit (serializes over-the-cap jobs)", async () => {
    process.env.STORAGE_PROVIDER = "r2";
    const prisma = makePrismaMock();
    prisma.media.findUnique.mockResolvedValue({ id: "m", status: MediaStatus.UPLOADED });
    prisma.media.updateMany.mockResolvedValue({ count: 1 });

    let concurrentNow = 0;
    let maxObserved = 0;
    const videoService = {
      process: jest.fn(async () => {
        concurrentNow++;
        maxObserved = Math.max(maxObserved, concurrentNow);
        await new Promise((r) => setTimeout(r, 20));
        concurrentNow--;
        return { originalUrl: "https://x/v.mp4" };
      }),
    };
    const imageService = { process: jest.fn() };

    const svc = new MediaProcessingService(
      prisma as any,
      imageService as any,
      videoService as any,
      makeConfigMock({ WORKER_MAX_CONCURRENT_VIDEO_JOBS: 1 }) as any,
    );

    await Promise.all(
      ["v1", "v2", "v3"].map((mediaId) =>
        svc.process(JobName.PROCESS_VIDEO, {
          mediaId,
          eventId: "e1",
          storageKey: `k-${mediaId}`,
          mimeType: "video/mp4",
          type: "VIDEO",
        } as any),
      ),
    );

    expect(maxObserved).toBe(1);
    expect(videoService.process).toHaveBeenCalledTimes(3);
  });
});
