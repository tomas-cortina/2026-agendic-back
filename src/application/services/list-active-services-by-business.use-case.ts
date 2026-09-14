import { Inject, Injectable } from '@nestjs/common';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { Service } from '../../domain/services/service';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { assertBusinessExists } from '../businesses/assert-owner';

@Injectable()
export class ListActiveServicesByBusinessUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
  ) {}

  async execute(businessId: number): Promise<Service[]> {
    assertBusinessExists(await this.businesses.findById(businessId));
    return this.services.listActiveByBusiness(businessId);
  }
}
