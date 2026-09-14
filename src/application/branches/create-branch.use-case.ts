import { Inject, Injectable } from '@nestjs/common';
import { Branch, assertValidHours, CreateBranchInput } from '../../domain/branches/branch';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { assertOwner } from '../businesses/assert-owner';

@Injectable()
export class CreateBranchUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
  ) {}

  async execute(
    userId: number,
    businessId: number,
    input: CreateBranchInput,
  ): Promise<Branch> {
    assertOwner(await this.businesses.findById(businessId), userId);
    assertValidHours(input.opensAt, input.closesAt);
    return this.branches.create({ businessId, ...input });
  }
}
