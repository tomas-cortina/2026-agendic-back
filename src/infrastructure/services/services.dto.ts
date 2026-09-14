import { IsInt, IsNumber, Min } from 'class-validator';
import { IfPresent, IsName, IsText } from '../users/users.dto';

export class CreateServiceDto {
  @IsName()
  name!: string;

  @IfPresent()
  @IsText()
  description?: string;

  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @IsNumber()
  @Min(0)
  price!: number;
}

export class UpdateServiceDto {
  @IfPresent()
  @IsName()
  name?: string;

  @IfPresent()
  @IsText()
  description?: string;

  @IfPresent()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IfPresent()
  @IsNumber()
  @Min(0)
  price?: number;
}
