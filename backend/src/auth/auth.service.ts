import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly saltRounds: number;
  private readonly accessSecret: string;
  private readonly accessExpiration: string;
  private readonly refreshSecret: string;
  private readonly refreshExpiration: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.saltRounds = Number(config.get('BCRYPT_SALT_ROUNDS') ?? 12);
    this.accessSecret = config.get<string>('JWT_SECRET') ?? 'change-me-access-secret';
    this.accessExpiration = config.get<string>('JWT_ACCESS_EXPIRATION') ?? '15m';
    this.refreshSecret = config.get<string>('JWT_REFRESH_SECRET') ?? 'change-me-refresh-secret';
    this.refreshExpiration = config.get<string>('JWT_REFRESH_EXPIRATION') ?? '30d';
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email is already registered');

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: dto.displayName.trim(),
        lastLoginAt: new Date(),
      },
    });

    const tokens = await this.issueTokens(user.id, user.email);
    return { user: toAuthUser(user), tokens };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Uniform failure message: do not leak whether the email exists.
    const invalid = new UnauthorizedException('Invalid email or password');
    if (!user) throw invalid;

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw invalid;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user.id, user.email);
    return {
      user: toAuthUser({ ...user, lastLoginAt: new Date() }),
      tokens,
    };
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    let payload: { sub: string; email: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: this.refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const stored = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (!stored || stored.userId !== payload.sub) {
      throw new UnauthorizedException('Refresh token not recognised');
    }
    if (stored.revokedAt) throw new UnauthorizedException('Refresh token revoked');
    if (stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }
    const matches = await bcrypt.compare(refreshToken, stored.tokenHash);
    if (!matches) throw new UnauthorizedException('Refresh token mismatch');

    // Rotate: revoke old, issue new.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();

    const tokens = await this.issueTokens(user.id, user.email);
    return { user: toAuthUser(user), tokens };
  }

  async logout(refreshToken: string | undefined, userId: string): Promise<void> {
    if (refreshToken) {
      try {
        const payload = await this.jwt.verifyAsync<{ jti: string; sub: string }>(refreshToken, {
          secret: this.refreshSecret,
        });
        if (payload.sub === userId) {
          await this.prisma.refreshToken.updateMany({
            where: { id: payload.jti, userId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          return;
        }
      } catch {
        /* fall through to bulk revoke below */
      }
    }
    // No valid token provided → revoke everything active for this user.
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return toAuthUser(user);
  }

  private async issueTokens(userId: string, email: string) {
    const jti = cryptoRandomId();
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email },
      { secret: this.accessSecret, expiresIn: this.accessExpiration },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, email, jti },
      { secret: this.refreshSecret, expiresIn: this.refreshExpiration },
    );

    const decoded = this.jwt.decode(refreshToken) as { exp?: number } | null;
    const expiresAt = new Date((decoded?.exp ?? Math.floor(Date.now() / 1000) + 30 * 24 * 3600) * 1000);
    const tokenHash = await bcrypt.hash(refreshToken, this.saltRounds);
    await this.prisma.refreshToken.create({
      data: { id: jti, userId, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}

function toAuthUser(user: {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
  lastLoginAt: Date | null;
}): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

function cryptoRandomId(): string {
  // 24-byte base64url — enough entropy for a JWT jti and matches Prisma cuid style.
  const bytes = require('crypto').randomBytes(24) as Buffer;
  return bytes.toString('base64url');
}
