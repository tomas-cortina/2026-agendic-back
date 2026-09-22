import { EmployeeSummary } from '../employees/employee';

export enum ServiceCategory {
  CLINICA = 'CLINICA',
  SPA = 'SPA',
  GIMNASIO = 'GIMNASIO',
  ACADEMIA = 'ACADEMIA',
  OTRO = 'OTRO',
}

export interface Service {
  id: number;
  branchId: number;
  name: string;
  description: string | null;
  category: ServiceCategory;
  durationMinutes: number;
  price: number;
  retiredAt: Date | null;
  /** In charge of it: verified and not dados de baja. */
  employees: EmployeeSummary[];
}

export interface CreateServiceInput {
  name: string;
  description?: string;
  category: ServiceCategory;
  durationMinutes: number;
  price: number;
  employeeIds: number[];
}

export interface UpdateServiceInput {
  name?: string;
  description?: string;
  category?: ServiceCategory;
  durationMinutes?: number;
  price?: number;
}
