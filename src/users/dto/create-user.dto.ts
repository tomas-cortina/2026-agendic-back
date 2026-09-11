import { IsString, IsNotEmpty, IsEmail, MinLength, IsIn } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name!: string;

  @IsEmail({}, { message: 'Debe ser un email válido' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;

  @IsString()
  @IsIn(['admin', 'customer'], { message: 'El rol debe ser admin o customer' })
  role!: 'admin' | 'customer';
}