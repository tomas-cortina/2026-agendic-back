import { Inject, Injectable } from '@nestjs/common';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { CreateServiceInput, Service } from '../../domain/services/service';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { assertBranchOwner } from '../branches/assert-branch-owner';

@Injectable()
export class CreateServiceUseCase {
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
    branchId: number,
    input: CreateServiceInput,
  ): Promise<Service> {
    await assertBranchOwner(this.branches, this.businesses, branchId, userId);
    return this.services.create({
      branchId,
      name: input.name,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes,
      price: input.price,
    });
  }
}
