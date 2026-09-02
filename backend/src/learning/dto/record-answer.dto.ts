import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, MaxLength, MinLength } from 'class-validator';

export class RecordAnswerDto {
  @ApiProperty({ description: 'Word rank, exercise id, or "verb:person"' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  wordRef!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  answer!: string;

  @ApiProperty()
  @IsBoolean()
  correct!: boolean;
}
