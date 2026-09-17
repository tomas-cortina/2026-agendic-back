import { Branch } from '../../domain/branches/branch';
import { BranchesRepository } from '../../domain/branches/branches.repository';
import { BusinessesRepository } from '../../domain/businesses/businesses.repository';
import { NotFoundError } from '../../domain/errors';
import { assertOwner } from '../businesses/assert-owner';

export function assertBranchExists(
  branch: Branch | null,
): asserts branch is Branch {
  if (!branch) throw new NotFoundError('Branch not found');
}

/** Throws NotFoundError for an unknown Branch, then ForbiddenError unless userId owns its Business. */
export async function assertBranchOwner(
  branches: BranchesRepository,
  businesses: BusinessesRepository,
  branchId: number,
  userId: number,
): Promise<Branch> {
  const branch = await branches.findById(branchId);
  assertBranchExists(branch);
  assertOwner(await businesses.findById(branch.businessId), userId);
  return branch;
}
