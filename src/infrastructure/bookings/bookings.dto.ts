import { IsDateString, IsInt, IsString } from 'class-validator';
import { IsName, IsNormalizedEmail } from '../users/users.dto';

export class CreateBookingDto {
  @IsInt()
  serviceId!: number;

  @IsInt()
  employeeId!: number;

  @IsDateString()
  startsAt!: string;

  @IsName()
  clientName!: string;

  @IsNormalizedEmail()
  clientEmail!: string;
}

export class VerifyBookingDto {
  @IsString()
  token!: string;
}
