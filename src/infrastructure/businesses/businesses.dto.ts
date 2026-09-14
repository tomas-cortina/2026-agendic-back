import { IfPresent, IsName, IsText } from '../users/users.dto';

export class CreateBusinessDto {
  @IsName()
  name!: string;

  @IsText()
  description!: string;
}

export class UpdateBusinessDto {
  @IfPresent()
  @IsName()
  name?: string;

  @IfPresent()
  @IsText()
  description?: string;
}
