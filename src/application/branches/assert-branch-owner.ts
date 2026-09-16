import { Branch } from '../../domain/branches/branch';
import { BranchesRepository } from '../../domain/branches/branches.repository';
import { BusinessesRepository } from '../../domain/businesses/businesses.repository';
import { NotFoundError } from '../../domain/errors';
import { assertOwner } from '../businesses/assert-owner';

/** Throws NotFoundError for an unknown Branch, then ForbiddenError unless userId owns its Business. */
export async function assertBranchOwner(
  branches: BranchesRepository,
  businesses: BusinessesRepository,
  branchId: number,
  userId: number,
): Promise<Branch> {
  const branch = await branches.findById(branchId);
  if (!branch) throw new NotFoundError('Branch not found');
  assertOwner(await businesses.findById(branch.businessId), userId);
  return branch;
}
