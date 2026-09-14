import { Injectable } from '@nestjs/common';
import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import { Service } from '../../domain/services/service';
import { ServicesRepository } from '../../domain/services/services.repository';
import { Prisma, Service as ServiceRow } from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaServicesRepository implements ServicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Pick<
      Service,
      'businessId' | 'name' | 'description' | 'durationMinutes' | 'price'
    >,
  ) {
    return toService(
      await this.prisma.service.create({ data }).catch(translateError),
    );
  }

  async findById(id: number) {
    const row = await this.prisma.service
      .findUnique({ where: { id } })
      .catch(translateError);
    return row && toService(row);
  }

  async listActiveByBusiness(businessId: number) {
    return (
      await this.prisma.service
        .findMany({ where: { businessId, retiredAt: null } })
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
        .update({ where: { id }, data })
        .catch(translateError),
    );
  }

  async retire(id: number, retiredAt: Date) {
    return toService(
      await this.prisma.service
        .update({ where: { id }, data: { retiredAt } })
        .catch(translateError),
    );
  }
}

const toService = (row: ServiceRow): Service => ({
  id: row.id,
  businessId: row.businessId,
  name: row.name,
  description: row.description,
  durationMinutes: row.durationMinutes,
  price: Number(row.price),
  retiredAt: row.retiredAt,
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
