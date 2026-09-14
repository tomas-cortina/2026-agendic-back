import { Inject, Injectable } from '@nestjs/common';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { CreateServiceInput, Service } from '../../domain/services/service';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { assertOwner } from '../businesses/assert-owner';

@Injectable()
export class CreateServiceUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
  ) {}

  async execute(
    userId: number,
    businessId: number,
    input: CreateServiceInput,
  ): Promise<Service> {
    assertOwner(await this.businesses.findById(businessId), userId);
    return this.services.create({
      businessId,
      name: input.name,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes,
      price: input.price,
    });
  }
}
