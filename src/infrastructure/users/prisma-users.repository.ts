import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import {
  BusinessRuleError,
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import { Role, User } from '../../domain/users/user';
import { UsersRepository } from '../../domain/users/users.repository';
import { Prisma, User as UserRow } from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

/** Stores only a hash of each verification token, so a leaked table can't be used to verify an email. */
const hash = (token: string) =>
  createHash('sha256').update(token).digest('base64url');

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Pick<User, 'name' | 'email' | 'passwordHash'>) {
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

  async findByEmail(email: string) {
    const row = await this.prisma.user
      .findUnique({ where: { email } })
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

  async setPendingEmail(id: number, email: string) {
    const existing = await this.prisma.user
      .findUnique({ where: { email } })
      .catch(translateError);
    if (existing)
      throw new ConflictError('Email already registered', {
        cause: new Error(`Email ${email} is already registered`),
      });
    return toUser(
      await this.prisma.user
        .update({ where: { id }, data: { pendingEmail: email } })
        .catch(translateError),
    );
  }

  async issueVerificationToken(userId: number, expiresAt: Date) {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.user
      .update({
        where: { id: userId },
        data: {
          verificationTokenHash: hash(token),
          verificationTokenExpiresAt: expiresAt,
        },
      })
      .catch(translateError);
    return token;
  }

  async verifyEmail(token: string, now: Date) {
    const row = await this.prisma.user
      .findUnique({ where: { verificationTokenHash: hash(token) } })
      .catch(translateError);
    if (
      !row ||
      !row.verificationTokenExpiresAt ||
      row.verificationTokenExpiresAt <= now
    )
      throw new BusinessRuleError(
        'Unknown, used or expired verification token',
      );
    return toUser(
      await this.prisma.user
        .update({
          where: { id: row.id },
          data: {
            email: row.pendingEmail ?? row.email,
            pendingEmail: null,
            emailVerifiedAt: now,
            verificationTokenHash: null,
            verificationTokenExpiresAt: null,
          },
        })
        .catch(translateError),
    );
  }
}

const toUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  pendingEmail: row.pendingEmail,
  passwordHash: row.passwordHash,
  role: row.role as Role,
  emailVerifiedAt: row.emailVerifiedAt,
  createdAt: row.createdAt,
});

const translateError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002')
      throw new ConflictError('Email already registered', { cause: error });
    if (error.code === 'P2025')
      throw new NotFoundError('User not found', { cause: error });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
