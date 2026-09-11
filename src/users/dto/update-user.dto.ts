import { IsString, IsOptional, IsEmail, MinLength, IsIn, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsString()
  @IsIn(['admin', 'customer'])
  @IsOptional()
  role?: 'admin' | 'customer';

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}