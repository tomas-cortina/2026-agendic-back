import { IsString } from 'class-validator';
import { IsNormalizedEmail } from '../users/users.dto';

export class SignInDto {
  @IsNormalizedEmail()
  email!: string;

  @IsString()
  password!: string;
}
