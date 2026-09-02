import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class StartSessionDto {
  @ApiProperty({ description: 'Course id or slug' })
  @IsString()
  @MinLength(1)
  course!: string;
}
