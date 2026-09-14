import { Inject, Injectable } from '@nestjs/common';
import { Business, UpdateBusinessInput } from '../../domain/businesses/business';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { assertOwner } from './assert-owner';

@Injectable()
export class UpdateBusinessUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  async execute(
    userId: number,
    businessId: number,
    input: UpdateBusinessInput,
  ): Promise<Business> {
    assertOwner(await this.businesses.findById(businessId), userId);
    return this.businesses.update(businessId, input);
  }
}
