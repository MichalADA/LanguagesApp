import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';

export interface AuthSession extends AuthResponseDto {
  refreshToken: string;
}

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
    this.saltRounds = config.getOrThrow<number>('BCRYPT_SALT_ROUNDS');
    this.accessSecret = config.getOrThrow<string>('JWT_SECRET');
    this.accessExpiration = config.getOrThrow<string>('JWT_ACCESS_EXPIRATION');
    this.refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.refreshExpiration = config.getOrThrow<string>('JWT_REFRESH_EXPIRATION');
  }

  async register(dto: RegisterDto): Promise<AuthSession> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email is already registered');

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          displayName: dto.displayName.trim(),
          lastLoginAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }

    const tokens = await this.issueTokens(user.id, user.email);
    return {
      user: toAuthUser(user),
      tokens: { accessToken: tokens.accessToken },
      refreshToken: tokens.refreshToken,
    };
  }

  async login(dto: LoginDto): Promise<AuthSession> {
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
      tokens: { accessToken: tokens.accessToken },
      refreshToken: tokens.refreshToken,
    };
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
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

    // Atomically claim the token. Only one concurrent refresh may rotate it.
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { revokedAt: new Date() },
    });
    if (claimed.count !== 1) throw new UnauthorizedException('Refresh token already used');

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();

    const tokens = await this.issueTokens(user.id, user.email);
    return {
      user: toAuthUser(user),
      tokens: { accessToken: tokens.accessToken },
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = await this.jwt.verifyAsync<{ jti: string; sub: string }>(refreshToken, {
        secret: this.refreshSecret,
      });
      await this.prisma.refreshToken.updateMany({
        where: { id: payload.jti, userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // An invalid/expired cookie is cleared by the controller; logout stays idempotent.
    }
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
  return randomBytes(24).toString('base64url');
}
