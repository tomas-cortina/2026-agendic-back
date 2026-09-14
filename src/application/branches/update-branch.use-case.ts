import { Inject, Injectable } from '@nestjs/common';
import { Branch, assertValidHours, UpdateBranchInput } from '../../domain/branches/branch';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { NotFoundError } from '../../domain/errors';
import { assertOwner } from '../businesses/assert-owner';

@Injectable()
export class UpdateBranchUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
  ) {}

  async execute(
    userId: number,
    branchId: number,
    input: UpdateBranchInput,
  ): Promise<Branch> {
    const branch = await this.branches.findById(branchId);
    if (!branch) throw new NotFoundError('Branch not found');
    assertOwner(await this.businesses.findById(branch.businessId), userId);
    assertValidHours(
      input.opensAt ?? branch.opensAt,
      input.closesAt ?? branch.closesAt,
    );
    return this.branches.update(branchId, input);
  }
}
