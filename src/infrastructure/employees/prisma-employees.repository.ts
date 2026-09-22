import { Injectable } from '@nestjs/common';
import { Employee } from '../../domain/employees/employee';
import {
  CreateEmployeeData,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import { Employee as EmployeeRow, Prisma } from '../../generated/prisma/client';
import { cancelFutureBooked } from '../bookings/cancel-future-booked';
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

  async create(data: CreateEmployeeData) {
    return toEmployee(
      await this.prisma.employee.create({ data }).catch(translateError),
    );
  }

  async findById(id: number) {
    const row = await this.prisma.employee
      .findUnique({ where: { id } })
      .catch(translateError);
    return row && toEmployee(row);
  }

  async findByClerkId(clerkId: string) {
    const row = await this.prisma.employee
      .findUnique({ where: { clerkId } })
      .catch(translateError);
    return row && toEmployee(row);
  }

  async listActiveByBusiness(businessId: number) {
    return (
      await this.prisma.employee
        .findMany({ where: { businessId, retiredAt: null } })
        .catch(translateError)
    ).map(toEmployee);
  }

  async update(id: number, data: Partial<Pick<Employee, 'name'>>) {
    return toEmployee(
      await this.prisma.employee
        .update({ where: { id }, data })
        .catch(translateError),
    );
  }

  async retire(id: number, retiredAt: Date) {
    return this.prisma
      .$transaction(async (tx) => {
        const row = await tx.employee.update({
          where: { id },
          data: { retiredAt, services: { set: [] } },
        });
        const cancelledBookings = await cancelFutureBooked(
          tx,
          { employeeId: id },
          retiredAt,
        );
        return { employee: toEmployee(row), cancelledBookings };
      })
      .catch(translateError);
  }
}

export const toEmployee = (row: EmployeeRow): Employee => ({
  id: row.id,
  businessId: row.businessId,
  clerkId: row.clerkId,
  name: row.name,
  email: row.email,
  retiredAt: row.retiredAt,
});

const translateError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002')
      throw new ConflictError('Employee email already in use', {
        cause: error,
      });
    if (error.code === 'P2025')
      throw new NotFoundError('Employee not found', { cause: error });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
