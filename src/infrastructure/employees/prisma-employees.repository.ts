import { Injectable } from '@nestjs/common';
import { Employee } from '../../domain/employees/employee';
import { EmployeesRepository } from '../../domain/employees/employees.repository';
import { DatabaseOperationError } from '../../domain/errors';
import { Employee as EmployeeRow } from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaEmployeesRepository implements EmployeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByIds(ids: number[]) {
    return (
      await this.prisma.employee
        .findMany({ where: { id: { in: ids } } })
        .catch(translateError)
    ).map(toEmployee);
  }
}

export const toEmployee = (row: EmployeeRow): Employee => ({
  id: row.id,
  businessId: row.businessId,
  name: row.name,
  email: row.email,
  emailVerifiedAt: row.emailVerifiedAt,
  retiredAt: row.retiredAt,
});

const translateError = (error: unknown): never => {
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
