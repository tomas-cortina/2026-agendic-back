import { Branch } from './branch';

export const BRANCHES_REPOSITORY = Symbol('BranchesRepository');

export interface BranchesRepository {
  /** Generates the id. */
  create(
    data: Pick<
      Branch,
      'businessId' | 'name' | 'address' | 'opensAt' | 'closesAt'
    >,
  ): Promise<Branch>;
  findById(id: number): Promise<Branch | null>;
  listByBusiness(businessId: number): Promise<Branch[]>;
  /** Leaves undefined fields unchanged. */
  update(
    id: number,
    data: Partial<Pick<Branch, 'name' | 'address' | 'opensAt' | 'closesAt'>>,
  ): Promise<Branch>;
}
