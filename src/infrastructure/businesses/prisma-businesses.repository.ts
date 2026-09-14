import { Injectable } from '@nestjs/common';
import { Business } from '../../domain/businesses/business';
import { BusinessesRepository } from '../../domain/businesses/businesses.repository';
import { DatabaseOperationError, NotFoundError } from '../../domain/errors';
import {
  Business as BusinessRow,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaBusinessesRepository implements BusinessesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Pick<Business, 'name' | 'description' | 'ownerId'>) {
    return toBusiness(
      await this.prisma.business.create({ data }).catch(translateError),
    );
  }

  async findById(id: number) {
    const row = await this.prisma.business
      .findUnique({ where: { id } })
      .catch(translateError);
    return row && toBusiness(row);
  }

  async list() {
    return (await this.prisma.business.findMany().catch(translateError)).map(
      toBusiness,
    );
  }

  async update(id: number, data: Partial<Pick<Business, 'name' | 'description'>>) {
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
});

const translateError = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  )
    throw new NotFoundError('Business not found', { cause: error });
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
