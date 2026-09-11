import {
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
}
