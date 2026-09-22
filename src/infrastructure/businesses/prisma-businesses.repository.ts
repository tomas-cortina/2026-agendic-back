import { Injectable } from '@nestjs/common';
import { Business } from '../../domain/businesses/business';
import {
  BusinessesRepository,
  CreateBusinessData,
} from '../../domain/businesses/businesses.repository';
import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import { Business as BusinessRow, Prisma } from '../../generated/prisma/client';
import { toBranch, toTime } from '../branches/prisma-branches.repository';
import { toEmployee } from '../employees/prisma-employees.repository';
import {
  toService,
  VISIBLE_EMPLOYEES,
} from '../services/prisma-services.repository';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaBusinessesRepository implements BusinessesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One interactive transaction rather than a nested create: the Servicio and the Empleado are linked to each
   * other, and neither id exists until the other's row is written.
   */
  async create(data: CreateBusinessData) {
    return this.prisma
      .$transaction(async (tx) => {
        const business = await tx.business.create({ data: data.business });
        const branch = await tx.branch.create({
          data: {
            businessId: business.id,
            name: data.branch.name,
            address: data.branch.address,
            opensAt: toTime(data.branch.opensAt),
            closesAt: toTime(data.branch.closesAt),
          },
        });
        const employee = await tx.employee.create({
          data: { businessId: business.id, ...data.employee },
        });
        const service = await tx.service.create({
          data: {
            branchId: branch.id,
            ...data.service,
            employees: { connect: { id: employee.id } },
          },
          include: VISIBLE_EMPLOYEES,
        });
        return {
          business: toBusiness(business),
          branch: toBranch(branch),
          service: toService(service),
          employee: toEmployee(employee),
        };
      })
      .catch(translateError);
  }

  async findById(id: number) {
    const row = await this.prisma.business
      .findUnique({ where: { id } })
      .catch(translateError);
    return row && toBusiness(row);
  }

  async findByClerkOrgId(clerkOrgId: string) {
    const row = await this.prisma.business
      .findUnique({ where: { clerkOrgId } })
      .catch(translateError);
    return row && toBusiness(row);
  }

  async list() {
    return (await this.prisma.business.findMany().catch(translateError)).map(
      toBusiness,
    );
  }

  async update(
    id: number,
    data: Partial<Pick<Business, 'name' | 'description'>>,
  ) {
    return toBusiness(
      await this.prisma.business
        .update({ where: { id }, data })
        .catch(translateError),
    );
  }
}

const toBusiness = (row: BusinessRow): Business => ({
  id: row.id,
  name: row.name,
  description: row.description,
  ownerId: row.ownerId,
  clerkOrgId: row.clerkOrgId,
});

/** Business has no unique index of its own; a P2002 here comes from the Service or Employee written alongside it. */
const CONFLICT_BY_INDEX: Record<string, string> = {
  Service_branchId_name_ci_key: 'Service name already in use',
  Employee_businessId_email_ci_key: 'Employee email already in use',
};

/** Where ADR 0004 says the violated index's name arrives through @prisma/adapter-pg. */
const violatedIndex = (error: Prisma.PrismaClientKnownRequestError) =>
  (
    error.meta as
      | { driverAdapterError?: { cause?: { constraint?: { index?: string } } } }
      | undefined
  )?.driverAdapterError?.cause?.constraint?.index;

const translateError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002')
      throw new ConflictError(
        CONFLICT_BY_INDEX[violatedIndex(error) ?? ''] ??
          'Service name or Employee email already in use',
        { cause: error },
      );
    if (error.code === 'P2025')
      throw new NotFoundError('Business not found', { cause: error });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
