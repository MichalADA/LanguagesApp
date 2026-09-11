import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ListeningService {
  constructor(private readonly prisma: PrismaService) {}

  listSources() {
    return this.prisma.listeningSource.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async getSourceBySlug(slug: string) {
    const source = await this.prisma.listeningSource.findUnique({
      where: { slug },
    });
    if (!source) throw new NotFoundException('Listening source not found');
    return source;
  }

  async listUnits(slug: string) {
    const source = await this.getSourceBySlug(slug);
    const units = await this.prisma.listeningUnit.findMany({
      where: { sourceId: source.id },
      orderBy: [{ level: 'asc' }, { position: 'asc' }],
      include: {
        lessons: {
          orderBy: { position: 'asc' },
          select: { id: true, title: true, position: true, sourceUrl: true },
        },
      },
    });
    return { source, units };
  }

  async getLesson(id: string) {
    const lesson = await this.prisma.listeningLesson.findUnique({
      where: { id },
      include: {
        unit: { include: { source: true } },
        blocks: { orderBy: { position: 'asc' } },
      },
    });
    if (!lesson) throw new NotFoundException('Listening lesson not found');
    return lesson;
  }
}
