import { Employee } from './employee';

export const EMPLOYEES_REPOSITORY = Symbol('EmployeesRepository');

export interface CreateEmployeeData {
  businessId: number;
  clerkId: string;
  name: string;
  email: string;
}

export interface EmployeesRepository {
  /** Only the ids that exist, in no particular order. */
  listByIds(ids: number[]): Promise<Employee[]>;
  /** Throws ConflictError when the email is already used by an Employee not dado de baja in the same Business. */
  create(data: CreateEmployeeData): Promise<Employee>;
  findById(id: number): Promise<Employee | null>;
  findByClerkId(clerkId: string): Promise<Employee | null>;
  /** The Business's Employees not dados de baja. */
  listActiveByBusiness(businessId: number): Promise<Employee[]>;
  /** Leaves undefined fields unchanged. */
  update(id: number, data: Partial<Pick<Employee, 'name'>>): Promise<Employee>;
  /** Dado de baja: sets retiredAt, takes the Employee off every Service, and cancels their future BOOKED Bookings, atomically. */
  retire(
    id: number,
    retiredAt: Date,
  ): Promise<{ employee: Employee; cancelledBookings: number }>;
}
