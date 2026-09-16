export interface Employee {
  id: number;
  businessId: number;
  name: string;
  email: string;
  /** null while their verification link is still pending. */
  emailVerifiedAt: Date | null;
  /** When dado de baja; null while employed. */
  retiredAt: Date | null;
}

/** What anyone browsing a Sucursal sees of an Empleado: never their email. */
export type EmployeeSummary = Pick<Employee, 'id' | 'name'>;
