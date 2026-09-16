import { Service } from './service';

export const SERVICES_REPOSITORY = Symbol('ServicesRepository');

export interface ServicesRepository {
  /** Throws ConflictError when the name is taken by another active Service of the same Branch, in any casing. */
  create(
    data: Pick<
      Service,
      'branchId' | 'name' | 'description' | 'durationMinutes' | 'price'
    > & { employeeIds: number[] },
  ): Promise<Service>;
  findById(id: number): Promise<Service | null>;
  listActiveByBranch(branchId: number): Promise<Service[]>;
  /** Leaves undefined fields unchanged. Throws ConflictError on a rename to a taken name. */
  update(
    id: number,
    data: Partial<
      Pick<Service, 'name' | 'description' | 'durationMinutes' | 'price'>
    >,
  ): Promise<Service>;
  retire(id: number, retiredAt: Date): Promise<Service>;
}
