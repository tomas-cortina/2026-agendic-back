import { Branch } from '../branches/branch';
import { Employee } from '../employees/employee';
import { Service } from '../services/service';
import { Business } from './business';

export const BUSINESSES_REPOSITORY = Symbol('BusinessesRepository');

/** Everything a Negocio needs to take Turnos, written at once. */
export interface CreateBusinessData {
  business: Pick<Business, 'name' | 'description' | 'ownerId' | 'clerkOrgId'>;
  branch: Pick<Branch, 'name' | 'address' | 'opensAt' | 'closesAt'>;
  service: Pick<
    Service,
    'name' | 'description' | 'category' | 'durationMinutes' | 'price'
  >;
  /** The Dueño, in charge of that first Servicio. */
  employee: Pick<Employee, 'clerkId' | 'name' | 'email'>;
}

export interface CreatedBusiness {
  business: Business;
  branch: Branch;
  service: Service;
  employee: Employee;
}

export interface BusinessesRepository {
  /** Generates every id. Atomic: a failure in any part creates nothing. */
  create(data: CreateBusinessData): Promise<CreatedBusiness>;
  findById(id: number): Promise<Business | null>;
  findByClerkOrgId(clerkOrgId: string): Promise<Business | null>;
  list(): Promise<Business[]>;
  /** Leaves undefined fields unchanged. */
  update(
    id: number,
    data: Partial<Pick<Business, 'name' | 'description'>>,
  ): Promise<Business>;
}
