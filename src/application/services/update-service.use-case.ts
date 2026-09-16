import { Inject, Injectable } from '@nestjs/common';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { NotFoundError } from '../../domain/errors';
import { Service, UpdateServiceInput } from '../../domain/services/service';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { assertBranchOwner } from '../branches/assert-branch-owner';

@Injectable()
export class UpdateServiceUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
  ) {}

  async execute(
    userId: number,
    serviceId: number,
    input: UpdateServiceInput,
  ): Promise<Service> {
    const service = await this.services.findById(serviceId);
    if (!service) throw new NotFoundError('Service not found');
    await assertBranchOwner(
      this.branches,
      this.businesses,
      service.branchId,
      userId,
    );
    return this.services.update(serviceId, input);
  }
}
