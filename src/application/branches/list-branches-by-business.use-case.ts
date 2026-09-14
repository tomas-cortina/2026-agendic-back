import { Inject, Injectable } from '@nestjs/common';
import { Branch } from '../../domain/branches/branch';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { assertBusinessExists } from '../businesses/assert-owner';

@Injectable()
export class ListBranchesByBusinessUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
  ) {}

  async execute(businessId: number): Promise<Branch[]> {
    assertBusinessExists(await this.businesses.findById(businessId));
    return this.branches.listByBusiness(businessId);
  }
}
