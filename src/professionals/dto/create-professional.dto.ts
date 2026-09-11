import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class CreateProfessionalDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name!: string;

  @IsEmail({}, { message: 'Debe ser un email válido' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'La especialidad es requerida' })
  specialty!: string;
}