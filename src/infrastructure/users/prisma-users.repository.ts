import { Injectable } from '@nestjs/common';
import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import { User } from '../../domain/users/user';
import { UsersRepository } from '../../domain/users/users.repository';
import { Prisma, User as UserRow } from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Pick<User, 'clerkId' | 'name' | 'email'>) {
    return toUser(
      await this.prisma.user.create({ data }).catch(translateError),
    );
  }

  async findById(id: number) {
    const row = await this.prisma.user
      .findUnique({ where: { id } })
      .catch(translateError);
    return row && toUser(row);
  }

  async findByClerkId(clerkId: string) {
    const row = await this.prisma.user
      .findUnique({ where: { clerkId } })
      .catch(translateError);
    return row && toUser(row);
  }

  async findByEmail(email: string) {
    const row = await this.prisma.user
      .findFirst({ where: { email } })
      .catch(translateError);
    return row && toUser(row);
  }

  async update(id: number, data: Partial<Pick<User, 'name'>>) {
    return toUser(
      await this.prisma.user
        .update({ where: { id }, data })
        .catch(translateError),
    );
  }
}

const toUser = (row: UserRow): User => ({
  id: row.id,
  clerkId: row.clerkId,
  name: row.name,
  email: row.email,
  createdAt: row.createdAt,
});

const translateError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002')
      throw new ConflictError('Clerk identity already registered', {
        cause: error,
      });
    if (error.code === 'P2025')
      throw new NotFoundError('User not found', { cause: error });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
