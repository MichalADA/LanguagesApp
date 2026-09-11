import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, MaxLength, MinLength, IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';

export class RecordAnswerDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) eventId?: string;
  @IsOptional() @IsString() @MaxLength(80) gameType?: string;
  @IsOptional() @IsIn(['SOURCE_TO_TARGET','TARGET_TO_SOURCE']) direction?: string;
  @IsOptional() @IsBoolean() usedHint?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(86400000) responseTimeMs?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000) attemptsBeforeCorrect?: number;

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
