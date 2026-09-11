import { IsString, IsOptional, IsEmail, IsBoolean } from 'class-validator';

export class UpdateProfessionalDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  specialty?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}