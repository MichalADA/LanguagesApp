import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { PrismaService } from '../prisma/prisma.service';

interface HealthResponse {
  status: 'ok';
}

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  live(): HealthResponse {
    return { status: 'ok' };
  }

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  async ready(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Service is not ready');
    }
  }
}
