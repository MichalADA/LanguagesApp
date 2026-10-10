import {
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { DAILY_GOALS, XP_SOURCES } from "./xp.policy";

export class AwardXpDto {
  @IsString() @MinLength(1) @MaxLength(64) course!: string;
  /** Idempotency key: a retried request is not counted twice. */
  @IsString() @MinLength(1) @MaxLength(100) eventId!: string;
  @IsIn(Object.keys(XP_SOURCES)) source!: keyof typeof XP_SOURCES;
  @IsString() @Matches(/^[a-z0-9][a-z0-9:._-]{0,119}$/i) sourceId!: string;
  @IsInt() @Min(1) @Max(500) xp!: number;
}

export class DailyGoalDto {
  @IsIn([...DAILY_GOALS]) goal!: number;
}
