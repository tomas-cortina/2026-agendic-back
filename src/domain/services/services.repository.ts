import { Service } from './service';

export const SERVICES_REPOSITORY = Symbol('ServicesRepository');

export interface ServicesRepository {
  /** Throws ConflictError when the name is taken by another active Service of the same Business, in any casing. */
  create(
    data: Pick<
      Service,
      'businessId' | 'name' | 'description' | 'durationMinutes' | 'price'
    >,
  ): Promise<Service>;
  findById(id: number): Promise<Service | null>;
  listActiveByBusiness(businessId: number): Promise<Service[]>;
  /** Leaves undefined fields unchanged. Throws ConflictError on a rename to a taken name. */
  update(
    id: number,
    data: Partial<
      Pick<Service, 'name' | 'description' | 'durationMinutes' | 'price'>
    >,
  ): Promise<Service>;
  retire(id: number, retiredAt: Date): Promise<Service>;
}
