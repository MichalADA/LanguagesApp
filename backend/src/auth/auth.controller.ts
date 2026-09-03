import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { AuthService, type AuthSession } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import {
  clearRefreshTokenCookie,
  readRefreshTokenCookie,
  writeRefreshTokenCookie,
} from './refresh-token-cookie';
import type { RefreshCookieConfig } from './refresh-token-cookie';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookie: RefreshCookieConfig;

  constructor(private readonly auth: AuthService, config: ConfigService) {
    this.cookie = {
      name: config.getOrThrow<string>('AUTH_COOKIE_NAME'),
      secure: config.getOrThrow<boolean>('AUTH_COOKIE_SECURE'),
      maxAge: config.getOrThrow<number>('AUTH_REFRESH_COOKIE_MAX_AGE_MS'),
    };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOkResponse({ type: AuthResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const session = await this.auth.register(dto);
    writeRefreshTokenCookie(response, session.refreshToken, this.cookie);
    return publicResponse(session);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOkResponse({ type: AuthResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const session = await this.auth.login(dto);
    writeRefreshTokenCookie(response, session.refreshToken, this.cookie);
    return publicResponse(session);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiCookieAuth('refresh-cookie')
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    try {
      const session = await this.auth.refresh(this.requiredRefreshToken(request));
      writeRefreshTokenCookie(response, session.refreshToken, this.cookie);
      return publicResponse(session);
    } catch (error) {
      clearRefreshTokenCookie(response, this.cookie);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth('refresh-cookie')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(readRefreshTokenCookie(request, this.cookie));
    clearRefreshTokenCookie(response, this.cookie);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthUserDto })
  me(@CurrentUser() user: CurrentUserPayload): Promise<AuthUserDto> {
    return this.auth.me(user.sub);
  }

  private requiredRefreshToken(request: Request): string {
    const token = readRefreshTokenCookie(request, this.cookie);
    if (!token) {
      // Keep the same public error contract as an invalid or expired refresh token.
      throw new UnauthorizedException('Refresh cookie missing');
    }
    return token;
  }
}

function publicResponse(session: AuthSession): AuthResponseDto {
  return { user: session.user, tokens: session.tokens };
}
