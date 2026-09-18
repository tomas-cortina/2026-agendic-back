import {
  IsName,
  IsNormalizedEmail,
  IsVerificationCode,
} from '../users/users.dto';

export class CreateEmployeeDto {
  @IsName()
  name!: string;

  @IsNormalizedEmail()
  email!: string;
}

export class VerifyEmployeeDto {
  @IsNormalizedEmail()
  email!: string;

  @IsVerificationCode()
  code!: string;
}

export class UpdateEmployeeDto {
  @IsName()
  name!: string;
}
