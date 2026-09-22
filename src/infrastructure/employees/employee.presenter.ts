import { Employee } from '../../domain/employees/employee';

/** The Dueño's view. The public one, on a Servicio, is `{ id, name }` and lives in the Servicio presenter. */
export const presentEmployee = (employee: Employee) => ({
  id: employee.id,
  name: employee.name,
  email: employee.email,
});
