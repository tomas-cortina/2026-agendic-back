import { Injectable } from '@nestjs/common';
import { Employee } from '../../domain/employees/employee';
import {
  CreateEmployeeData,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import {
  ConflictError,
  DatabaseOperationError,
  ExpiredError,
  InvalidCodeError,
  NotFoundError,
} from '../../domain/errors';
import { Employee as EmployeeRow, Prisma } from '../../generated/prisma/client';
import { cancelFutureBooked } from '../bookings/cancel-future-booked';
import { PrismaService } from '../prisma.service';
import {
  generateVerificationCode,
  hashVerificationCode,
} from '../verification-code';

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

  async issueVerificationCode(employeeId: number, expiresAt: Date) {
    const code = generateVerificationCode();
    await this.prisma.employee
      .update({
        where: { id: employeeId },
        data: {
          verificationCodeHash: hashVerificationCode(code),
          verificationCodeExpiresAt: expiresAt,
        },
      })
      .catch(translateError);
    return code;
  }

  async verifyEmail(email: string, code: string, now: Date) {
    const row = await this.prisma.employee
      .findFirst({
        where: { email, verificationCodeHash: hashVerificationCode(code) },
      })
      .catch(translateError);
    if (!row || !row.verificationCodeExpiresAt)
      throw new InvalidCodeError('Unknown or already used verification code');
    if (row.verificationCodeExpiresAt <= now)
      throw new ExpiredError('Verification code expired');
    return toEmployee(
      await this.prisma.employee
        .update({
          where: { id: row.id },
          data: {
            emailVerifiedAt: now,
            verificationCodeHash: null,
            verificationCodeExpiresAt: null,
          },
        })
        .catch(translateError),
    );
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
