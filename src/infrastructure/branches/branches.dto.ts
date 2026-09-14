import { applyDecorators } from '@nestjs/common';
import { Matches } from 'class-validator';
import { IfPresent, IsName, IsText } from '../users/users.dto';

export const IsTimeOfDay = () =>
  applyDecorators(
    Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'must be a HH:mm time' }),
  );

export class CreateBranchDto {
  @IsName()
  name!: string;

  @IsText()
  address!: string;

  @IsTimeOfDay()
  opensAt!: string;

  @IsTimeOfDay()
  closesAt!: string;
}

export class UpdateBranchDto {
  @IfPresent()
  @IsName()
  name?: string;

  @IfPresent()
  @IsText()
  address?: string;

  @IfPresent()
  @IsTimeOfDay()
  opensAt?: string;

  @IfPresent()
  @IsTimeOfDay()
  closesAt?: string;
}
