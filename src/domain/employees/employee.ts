export interface Employee {
  id: number;
  businessId: number;
  clerkId: string;
  name: string;
  email: string;
  /** When dado de baja; null while employed. */
  retiredAt: Date | null;
}

/** What anyone browsing a Sucursal sees of an Empleado: never their email. */
export type EmployeeSummary = Pick<Employee, 'id' | 'name'>;
