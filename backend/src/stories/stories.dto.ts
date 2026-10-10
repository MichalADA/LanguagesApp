import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

/** Story, mission and flag ids are short slugs defined by the frontend content. */
export const SLUG = /^[a-z0-9][a-z0-9:-]{0,63}$/;

export class CompleteMissionDto {
  @IsString() @MinLength(1) @MaxLength(64) course!: string;
  /** Idempotency key: a retried request with the same id is not counted twice. */
  @IsString() @MinLength(1) @MaxLength(100) eventId!: string;
  /** Mission score in percent. */
  @IsInt() @Min(0) @Max(100) score!: number;
  /** Reward for the first completion (granted once). */
  @IsInt() @Min(0) @Max(500) xp!: number;
  /** Story flags set during the mission (merged into the story state). */
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Matches(SLUG, { each: true })
  flags!: string[];
}
