import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { AuthUserDto } from '../auth/dto/auth-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<AuthUserDto> {
    const data: { displayName?: string } = {};
    if (dto.displayName !== undefined) data.displayName = dto.displayName.trim();
    const user = await this.prisma.user.update({ where: { id: userId }, data });
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
