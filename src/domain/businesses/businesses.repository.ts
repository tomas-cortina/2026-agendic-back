import { Business } from './business';

export const BUSINESSES_REPOSITORY = Symbol('BusinessesRepository');

export interface BusinessesRepository {
  /** Generates the id. */
  create(
    data: Pick<Business, 'name' | 'description' | 'ownerId'>,
  ): Promise<Business>;
  findById(id: number): Promise<Business | null>;
  list(): Promise<Business[]>;
  /** Leaves undefined fields unchanged. */
  update(
    id: number,
    data: Partial<Pick<Business, 'name' | 'description'>>,
  ): Promise<Business>;
}
