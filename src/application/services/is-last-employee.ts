import { Service } from '../../domain/services/service';

/** Servicios dados de baja don't count for this rule. */
export function isLastEmployee(
  service: Service,
  employeeId: number,
): boolean {
  return (
    service.retiredAt === null &&
    service.employees.length === 1 &&
    service.employees[0].id === employeeId
  );
}
