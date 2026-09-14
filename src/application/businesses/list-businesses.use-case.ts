import { Inject, Injectable } from '@nestjs/common';
import { Business } from '../../domain/businesses/business';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';

@Injectable()
export class ListBusinessesUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  execute(): Promise<Business[]> {
    return this.businesses.list();
  }
}
