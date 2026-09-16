import { Injectable } from '@nestjs/common';
import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import { Service } from '../../domain/services/service';
import { ServicesRepository } from '../../domain/services/services.repository';
import {
  Employee as EmployeeRow,
  Prisma,
  Service as ServiceRow,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

/** Only the Empleados anyone browsing may see attending a Servicio: verified and not dados de baja. */
export const VISIBLE_EMPLOYEES = {
  employees: {
    where: { emailVerifiedAt: { not: null }, retiredAt: null },
    select: { id: true, name: true },
  },
} satisfies Prisma.ServiceInclude;

type ServiceRowWithEmployees = ServiceRow & {
  employees: Pick<EmployeeRow, 'id' | 'name'>[];
};

@Injectable()
export class PrismaServicesRepository implements ServicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Pick<
      Service,
      'branchId' | 'name' | 'description' | 'durationMinutes' | 'price'
    > & { employeeIds: number[] },
  ) {
    const { employeeIds, ...service } = data;
    return toService(
      await this.prisma.service
        .create({
          data: {
            ...service,
            employees: { connect: employeeIds.map((id) => ({ id })) },
          },
          include: VISIBLE_EMPLOYEES,
        })
        .catch(translateError),
    );
  }

  async findById(id: number) {
    const row = await this.prisma.service
      .findUnique({ where: { id }, include: VISIBLE_EMPLOYEES })
      .catch(translateError);
    return row && toService(row);
  }

  async listActiveByBranch(branchId: number) {
    return (
      await this.prisma.service
        .findMany({
          where: { branchId, retiredAt: null },
          include: VISIBLE_EMPLOYEES,
        })
        .catch(translateError)
    ).map(toService);
  }

  async update(
    id: number,
    data: Partial<
      Pick<Service, 'name' | 'description' | 'durationMinutes' | 'price'>
    >,
  ) {
    return toService(
      await this.prisma.service
        .update({ where: { id }, data, include: VISIBLE_EMPLOYEES })
        .catch(translateError),
    );
  }

  async retire(id: number, retiredAt: Date) {
    return toService(
      await this.prisma.service
        .update({
          where: { id },
          data: { retiredAt },
          include: VISIBLE_EMPLOYEES,
        })
        .catch(translateError),
    );
  }
}

export const toService = (row: ServiceRowWithEmployees): Service => ({
  id: row.id,
  branchId: row.branchId,
  name: row.name,
  description: row.description,
  durationMinutes: row.durationMinutes,
  price: Number(row.price),
  retiredAt: row.retiredAt,
  employees: row.employees.map(({ id, name }) => ({ id, name })),
});

const translateError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002')
      throw new ConflictError('Service name already in use', {
        cause: error,
      });
    if (error.code === 'P2025')
      throw new NotFoundError('Service not found', { cause: error });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
