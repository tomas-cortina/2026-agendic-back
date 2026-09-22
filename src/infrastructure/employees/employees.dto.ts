import { IsName, IsNormalizedEmail } from '../users/users.dto';

export class CreateEmployeeDto {
  @IsNormalizedEmail()
  email!: string;
}

export class UpdateEmployeeDto {
  @IsName()
  name!: string;
}
