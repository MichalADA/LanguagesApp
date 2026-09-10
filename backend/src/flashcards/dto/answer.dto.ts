import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export type RatingLiteral = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
export type DirectionLiteral = 'SOURCE_TO_TARGET' | 'TARGET_TO_SOURCE';

const RATINGS: RatingLiteral[] = ['AGAIN', 'HARD', 'GOOD', 'EASY'];
const DIRECTIONS: DirectionLiteral[] = ['SOURCE_TO_TARGET', 'TARGET_TO_SOURCE'];

export class SubmitAnswerDto {
  @ApiProperty({ description: 'Course id or slug (e.g. "pl-hr").' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  course!: string;

  @ApiProperty({ description: 'Stable word reference, "<course>:<rank>".' })
  @IsString()
  @Matches(/^[\w-]+:\d+$/, {
    message: 'wordRef must match "<course>:<rank>"',
  })
  wordRef!: string;

  @ApiProperty({ enum: DIRECTIONS })
  @IsIn(DIRECTIONS)
  direction!: DirectionLiteral;

  @ApiProperty({ description: 'What the user typed. Empty string is allowed.' })
  @IsString()
  @MaxLength(500)
  answer!: string;

  @ApiProperty({ description: 'Whether the answer matched (checked on the client).' })
  @IsBoolean()
  correct!: boolean;

  @ApiProperty({ enum: RATINGS, description: 'User-picked SRS rating.' })
  @IsIn(RATINGS)
  rating!: RatingLiteral;

  @ApiProperty({ required: false, description: 'Optional flashcard session id.' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;
}

export class SeenWordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  course!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[\w-]+:\d+$/)
  wordRef!: string;
}

export class ToggleDifficultDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  course!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[\w-]+:\d+$/)
  wordRef!: string;

  @ApiProperty()
  @IsBoolean()
  markedDifficult!: boolean;
}

export class StartFlashcardSessionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  course!: string;

  @ApiProperty({ enum: ['NEW', 'REVIEW', 'MIXED', 'DIFFICULT'] })
  @IsEnum(['NEW', 'REVIEW', 'MIXED', 'DIFFICULT'])
  mode!: 'NEW' | 'REVIEW' | 'MIXED' | 'DIFFICULT';

  @ApiProperty({ enum: ['SOURCE_TO_TARGET', 'TARGET_TO_SOURCE', 'MIXED'] })
  @IsEnum(['SOURCE_TO_TARGET', 'TARGET_TO_SOURCE', 'MIXED'])
  direction!: 'SOURCE_TO_TARGET' | 'TARGET_TO_SOURCE' | 'MIXED';
}
