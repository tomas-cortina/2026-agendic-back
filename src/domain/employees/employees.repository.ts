import { Employee } from './employee';

export const EMPLOYEES_REPOSITORY = Symbol('EmployeesRepository');

export interface CreateEmployeeData {
  businessId: number;
  name: string;
  email: string;
  /** Set at once when the email belongs to an already verified Usuario; null otherwise. */
  emailVerifiedAt: Date | null;
}

export interface EmployeesRepository {
  /** Only the ids that exist, in no particular order. */
  listByIds(ids: number[]): Promise<Employee[]>;
  /** Throws ConflictError when the email is already used by an Employee not dado de baja in the same Business. */
  create(data: CreateEmployeeData): Promise<Employee>;
  findById(id: number): Promise<Employee | null>;
  /** The Business's Employees not dados de baja. */
  listActiveByBusiness(businessId: number): Promise<Employee[]>;
  /** Leaves undefined fields unchanged. */
  update(id: number, data: Partial<Pick<Employee, 'name'>>): Promise<Employee>;
  /** Dado de baja: sets retiredAt and takes the Employee off every Service. */
  retire(id: number, retiredAt: Date): Promise<Employee>;
  /** Generates a single-use token expiring at expiresAt, replacing any previous one. Returns the raw token; only its hash is stored. */
  issueVerificationToken(employeeId: number, expiresAt: Date): Promise<string>;
  /**
   * Consumes a single-use token: verifies the Employee's email.
   * Throws BusinessRuleError for an unknown, already used or expired token.
   */
  verifyEmail(token: string, now: Date): Promise<Employee>;
}
