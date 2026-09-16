import { Type } from 'class-transformer';
import { IsObject, ValidateNested } from 'class-validator';
import { CreateBranchDto } from '../branches/branches.dto';
import { ServiceFieldsDto } from '../services/services.dto';
import { IfPresent, IsName, IsText } from '../users/users.dto';

class BusinessFieldsDto {
  @IsName()
  name!: string;

  @IsText()
  description!: string;
}

/** The three parts a Negocio is created with, each validated as its own endpoint validates it. */
export class CreateBusinessDto {
  @IsObject()
  @ValidateNested()
  @Type(() => BusinessFieldsDto)
  business!: BusinessFieldsDto;

  @IsObject()
  @ValidateNested()
  @Type(() => CreateBranchDto)
  branch!: CreateBranchDto;

  @IsObject()
  @ValidateNested()
  @Type(() => ServiceFieldsDto)
  service!: ServiceFieldsDto;
}

export class UpdateBusinessDto {
  @IfPresent()
  @IsName()
  name?: string;

  @IfPresent()
  @IsText()
  description?: string;
}
