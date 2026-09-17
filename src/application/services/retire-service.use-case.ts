import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { NotFoundError } from '../../domain/errors';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { assertBranchOwner } from '../branches/assert-branch-owner';

@Injectable()
export class RetireServiceUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
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
    await assertBranchOwner(
      this.branches,
      this.businesses,
      service.branchId,
      userId,
    );
    const { cancelledBookings } = await this.services.retire(
      serviceId,
      this.clock.now(),
    );
    return { id: serviceId, cancelledBookings };
  }
}
