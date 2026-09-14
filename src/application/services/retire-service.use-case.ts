import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { NotFoundError } from '../../domain/errors';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { assertOwner } from '../businesses/assert-owner';

@Injectable()
export class RetireServiceUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(
    userId: number,
    serviceId: number,
  ): Promise<{ id: number; cancelledBookings: number }> {
    const service = await this.services.findById(serviceId);
    if (!service) throw new NotFoundError('Service not found');
    assertOwner(await this.businesses.findById(service.businessId), userId);
    await this.services.retire(serviceId, this.clock.now());
    // ponytail: Turnos don't exist yet; the cascade that cancels future Bookings arrives in ticket 07.
    return { id: serviceId, cancelledBookings: 0 };
  }
}
