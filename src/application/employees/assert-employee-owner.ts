import { BusinessesRepository } from '../../domain/businesses/businesses.repository';
import { Employee } from '../../domain/employees/employee';
import { EmployeesRepository } from '../../domain/employees/employees.repository';
import { NotFoundError } from '../../domain/errors';
import { assertOwner } from '../businesses/assert-owner';

/** Throws NotFoundError for an unknown Employee, then ForbiddenError unless userId owns its Business. */
export async function assertEmployeeOwner(
  employees: EmployeesRepository,
  businesses: BusinessesRepository,
  employeeId: number,
  userId: number,
): Promise<Employee> {
  const employee = await employees.findById(employeeId);
  if (!employee) throw new NotFoundError('Employee not found');
  assertOwner(await businesses.findById(employee.businessId), userId);
  return employee;
}
