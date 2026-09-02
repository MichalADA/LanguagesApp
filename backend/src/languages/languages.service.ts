import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LanguagesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.language.findMany({ orderBy: { code: 'asc' } });
  }
}
