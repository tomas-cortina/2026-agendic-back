import { Injectable } from '@nestjs/common';
import {
  ConflictError,
  DatabaseOperationError,
  ExpiredError,
  InvalidCodeError,
  NotFoundError,
} from '../../domain/errors';
import { Role, User } from '../../domain/users/user';
import { UsersRepository } from '../../domain/users/users.repository';
import { Prisma, User as UserRow } from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import {
  generateVerificationCode,
  hashVerificationCode,
} from '../verification-code';

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

  async issueVerificationCode(userId: number, expiresAt: Date) {
    const code = generateVerificationCode();
    await this.prisma.user
      .update({
        where: { id: userId },
        data: {
          verificationCodeHash: hashVerificationCode(code),
          verificationCodeExpiresAt: expiresAt,
        },
      })
      .catch(translateError);
    return code;
  }

  async verifyEmail(email: string, code: string, now: Date) {
    const row = await this.prisma.user
      .findFirst({
        where: {
          OR: [{ email }, { pendingEmail: email }],
          verificationCodeHash: hashVerificationCode(code),
        },
      })
      .catch(translateError);
    if (!row || !row.verificationCodeExpiresAt)
      throw new InvalidCodeError('Unknown or already used verification code');
    if (row.verificationCodeExpiresAt <= now)
      throw new ExpiredError('Verification code expired');
    return toUser(
      await this.prisma.user
        .update({
          where: { id: row.id },
          data: {
            email: row.pendingEmail ?? row.email,
            pendingEmail: null,
            emailVerifiedAt: now,
            verificationCodeHash: null,
            verificationCodeExpiresAt: null,
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
