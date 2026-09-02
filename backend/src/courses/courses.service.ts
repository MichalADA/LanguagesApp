import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.course.findMany({
      include: { sourceLanguage: true, targetLanguage: true },
      orderBy: { slug: 'asc' },
    });
  }

  async getBySlug(slug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: { sourceLanguage: true, targetLanguage: true },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }
}
