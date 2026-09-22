import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

const trimmed = (normalize: (value: string) => string = (value) => value) =>
  Transform(({ value }) =>
    typeof value === 'string' ? normalize(value.trim()) : value,
  );

/** Trimmed, non-empty string. Named for its original use (a person's name); reuse as IsText for other free text. */
export const IsName = () =>
  applyDecorators(trimmed(), IsString(), IsNotEmpty());

export const IsText = IsName;

export const IsNormalizedEmail = () =>
  applyDecorators(
    trimmed((value) => value.toLowerCase()),
    IsEmail(),
  );

/** Unlike @IsOptional, skips validation only when the field is absent, so null is rejected. */
export const IfPresent = () => ValidateIf((_, value) => value !== undefined);

export class UpdateMeDto {
  @IfPresent()
  @IsName()
  name?: string;
}
