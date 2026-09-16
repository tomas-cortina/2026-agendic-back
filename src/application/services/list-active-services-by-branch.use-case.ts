import { Inject, Injectable } from '@nestjs/common';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import { NotFoundError } from '../../domain/errors';
import { Service } from '../../domain/services/service';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';

@Injectable()
export class ListActiveServicesByBranchUseCase {
  constructor(
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
  ) {}

  async execute(branchId: number): Promise<Service[]> {
    const branch = await this.branches.findById(branchId);
    if (!branch) throw new NotFoundError('Branch not found');
    return this.services.listActiveByBranch(branchId);
  }
}
