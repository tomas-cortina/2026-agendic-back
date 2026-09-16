import { Employee } from './employee';

export const EMPLOYEES_REPOSITORY = Symbol('EmployeesRepository');

export interface EmployeesRepository {
  /** Only the ids that exist, in no particular order. */
  listByIds(ids: number[]): Promise<Employee[]>;
}
