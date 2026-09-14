import { Inject, Injectable } from '@nestjs/common';
import { Business, CreateBusinessInput } from '../../domain/businesses/business';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';

@Injectable()
export class CreateBusinessUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  execute(ownerId: number, input: CreateBusinessInput): Promise<Business> {
    return this.businesses.create({ ...input, ownerId });
  }
}
