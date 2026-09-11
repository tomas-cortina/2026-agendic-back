import { IsString, IsNotEmpty, IsEmail, IsDateString, IsUUID } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del cliente es obligatorio' })
  customerName!: string;

  @IsEmail({}, { message: 'El email del cliente debe ser válido' })
  customerEmail!: string;

  @IsString()
  @IsNotEmpty({ message: 'El ID del profesional es obligatorio' })
  professionalId!: string;

  @IsString()
  @IsNotEmpty({ message: 'El ID del servicio es obligatorio' })
  serviceId!: string;

  @IsDateString({}, { message: 'La fecha y hora deben tener un formato válido (ISO 8601)' })
  appointmentDate!: string;
}