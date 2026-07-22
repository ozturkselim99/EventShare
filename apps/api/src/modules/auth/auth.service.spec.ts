import { ForbiddenException } from "@nestjs/common";
import * as argon2 from "argon2";
import { AuthService } from "./auth.service";

function makeService(opts: {
  verifyReturn?: { sub: string } | Error;
  sessions?: any[];
}) {
  const prisma = {
    adminSession: {
      findMany: jest.fn().mockResolvedValue(opts.sessions ?? []),
      update: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
    },
  };
  const jwtService = {
    verify: jest.fn(() => {
      if (opts.verifyReturn instanceof Error) throw opts.verifyReturn;
      return opts.verifyReturn;
    }),
    sign: jest.fn().mockReturnValue("new-token"),
  };
  const config = { get: () => "secret" };

  const svc = new AuthService(prisma as any, jwtService as any, config as any);
  return { svc, prisma, jwtService };
}

describe("AuthService.refresh", () => {
  it("rejects a refresh token that doesn't verify against the JWT secret", async () => {
    const { svc } = makeService({ verifyReturn: new Error("bad sig") });
    await expect(svc.refresh("garbage")).rejects.toThrow(ForbiddenException);
  });

  it("scopes the session lookup to the token's own admin (sub claim) instead of a global search", async () => {
    const { svc, prisma } = makeService({ verifyReturn: { sub: "admin-42" }, sessions: [] });
    await expect(svc.refresh("tok")).rejects.toThrow(ForbiddenException);

    expect(prisma.adminSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ adminId: "admin-42" }),
      }),
    );
  });

  it("picks the correct session among several concurrently-active ones for the same admin", async () => {
    const realToken = "the-real-refresh-token";
    const realHash = await argon2.hash(realToken);
    const otherHash = await argon2.hash("a-different-sessions-token");

    const sessions = [
      { id: "session-other", refreshTokenHash: otherHash, admin: { id: "admin-1", email: "a@x.com" } },
      { id: "session-mine", refreshTokenHash: realHash, admin: { id: "admin-1", email: "a@x.com" } },
    ];
    const { svc, prisma } = makeService({ verifyReturn: { sub: "admin-1" }, sessions });

    const result = await svc.refresh(realToken);

    expect(result).toEqual({ accessToken: "new-token", refreshToken: "new-token" });
    expect(prisma.adminSession.update).toHaveBeenCalledWith({
      where: { id: "session-mine" },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("rejects when the token doesn't match any of the admin's active sessions", async () => {
    const wrongHash = await argon2.hash("some-other-token");
    const sessions = [{ id: "s1", refreshTokenHash: wrongHash, admin: { id: "admin-1", email: "a@x.com" } }];
    const { svc } = makeService({ verifyReturn: { sub: "admin-1" }, sessions });

    await expect(svc.refresh("presented-token")).rejects.toThrow(ForbiddenException);
  });
});
