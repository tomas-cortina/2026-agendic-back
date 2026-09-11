import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsNumber } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del servicio es requerido' })
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt({ message: 'La duración debe ser un número entero de minutos' })
  @Min(1, { message: 'La duración mínima es de 1 minuto' })
  durationMinutes!: number;

  @IsNumber({}, { message: 'El precio debe ser un número válido' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price!: number;
}