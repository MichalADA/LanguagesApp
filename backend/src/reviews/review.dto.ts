import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ReviewItemType } from "@prisma/client";

export class ReviewAnswerDto {
  @IsOptional() @IsString() @MaxLength(64) sessionId?: string;
  @IsString() @MinLength(1) @MaxLength(100) eventId!: string;
  @IsString() @MinLength(1) @MaxLength(64) course!: string;
  @IsEnum(ReviewItemType) itemType!: ReviewItemType;
  @IsString() @MinLength(1) @MaxLength(200) itemId!: string;
  @IsString() @MinLength(1) @MaxLength(80) gameType!: string;
  @IsOptional()
  @IsIn(["SOURCE_TO_TARGET", "TARGET_TO_SOURCE"])
  direction?: string;
  @IsBoolean() correct!: boolean;
  @IsString() @MaxLength(500) answer!: string;
  @IsOptional() @IsInt() @Min(0) @Max(86400000) responseTimeMs?: number;
  @IsOptional() @IsBoolean() usedHint?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(1000) attemptsBeforeCorrect?: number;
  /** Correct apart from diacritics (čaša → casa): counts as recalled, rated Hard. */
  @IsOptional() @IsBoolean() nearMiss?: boolean;
}

/** Item a lesson introduced. Only WORD (dataset vocabulary) and PHRASE (curriculum-only) are enrollable. */
export class EnrollItemDto {
  @IsIn(["WORD", "PHRASE"]) itemType!: "WORD" | "PHRASE";
  @IsString() @MinLength(1) @MaxLength(200) itemId!: string;
}

/**
 * Lesson material → new FSRS cards. Enrolling is not a review: no attempt is
 * recorded and no rating is given, so seeing a word never counts as knowing it.
 */
export class EnrollReviewItemsDto {
  @IsString() @MinLength(1) @MaxLength(64) course!: string;
  /** Where the material came from, e.g. "lesson:a1-01-02" (diagnostics only). */
  @IsString() @MinLength(1) @MaxLength(100) source!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => EnrollItemDto)
  items!: EnrollItemDto[];
}
