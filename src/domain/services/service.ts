import { EmployeeSummary } from '../employees/employee';

export interface Service {
  id: number;
  branchId: number;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  retiredAt: Date | null;
  /** In charge of it: verified and not dados de baja. */
  employees: EmployeeSummary[];
}

export interface CreateServiceInput {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  employeeIds: number[];
}

export interface UpdateServiceInput {
  name?: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
}
