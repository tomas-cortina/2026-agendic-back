import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseOperationError } from '../../domain/errors';
import { Session } from '../../domain/sessions/session';
import { SessionsRepository } from '../../domain/sessions/sessions.repository';
import { PrismaService } from '../prisma.service';

/** Stores only a hash of each Session id, so a leaked table can't be used to impersonate anyone. */
const hash = (id: string) =>
  createHash('sha256').update(id).digest('base64url');

@Injectable()
export class PrismaSessionsRepository implements SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ponytail: expired Sessions are rejected but never deleted; purge them (e.g. on sign-in) if the table grows.
  async create(data: Omit<Session, 'id'>) {
    const id = randomBytes(32).toString('base64url');
    await this.prisma.session
      .create({ data: { id: hash(id), ...data } })
      .catch(wrapError);
    return { id, ...data };
  }

  async findById(id: string) {
    const row = await this.prisma.session
      .findUnique({ where: { id: hash(id) } })
      .catch(wrapError);
    return row && { id, userId: row.userId, expiresAt: row.expiresAt };
  }

  async delete(id: string) {
    await this.prisma.session
      .deleteMany({ where: { id: hash(id) } })
      .catch(wrapError);
  }
}

const wrapError = (error: unknown): never => {
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
