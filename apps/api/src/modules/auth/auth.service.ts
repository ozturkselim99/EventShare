import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import type { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!admin) throw new UnauthorizedException("Invalid credentials");

    const valid = await argon2.verify(admin.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    return this.issueTokens(admin.id, admin.email);
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.adminSession.findFirst({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { admin: true },
    });

    if (!session) throw new ForbiddenException("Invalid refresh token");

    const valid = await argon2.verify(session.refreshTokenHash, refreshToken);
    if (!valid) throw new ForbiddenException("Invalid refresh token");

    await this.prisma.adminSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(session.admin.id, session.admin.email);
  }

  async logout(adminId: string) {
    await this.prisma.adminSession.updateMany({
      where: { adminId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(adminId: string, email: string) {
    const payload = { sub: adminId, email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>("app.jwtAccessSecret"),
      expiresIn: this.config.get<string>("app.jwtAccessExpiresIn") ?? "15m",
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>("app.jwtRefreshSecret"),
      expiresIn: this.config.get<string>("app.jwtRefreshExpiresIn") ?? "7d",
    });

    const refreshTokenHash = await argon2.hash(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.adminSession.create({
      data: { adminId, refreshTokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  async getProfile(adminId: string) {
    return this.prisma.admin.findUniqueOrThrow({
      where: { id: adminId },
      select: { id: true, email: true, createdAt: true },
    });
  }
}
