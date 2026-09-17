import { IsString } from 'class-validator';
import { IsName, IsNormalizedEmail } from '../users/users.dto';

export class CreateEmployeeDto {
  @IsName()
  name!: string;

  @IsNormalizedEmail()
  email!: string;
}

export class VerifyEmployeeDto {
  @IsString()
  token!: string;
}

export class UpdateEmployeeDto {
  @IsName()
  name!: string;
}
