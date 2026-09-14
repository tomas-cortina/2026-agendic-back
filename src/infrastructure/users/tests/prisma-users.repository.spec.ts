import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../../domain/errors';
import { Role, User } from '../../../domain/users/user';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import { PrismaUsersRepository } from '../prisma-users.repository';

const ANA: User = {
  id: 1,
  name: 'Ana',
  email: 'ana@example.com',
  passwordHash: 'salt:key',
  role: Role.USER,
  createdAt: new Date('2026-01-01T12:00:00.000Z'),
};

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('vendor message', {
    code,
    clientVersion: '7.10.0',
  });

describe('PrismaUsersRepository', () => {
  const prisma = {
    user: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  };
  const repository = new PrismaUsersRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => jest.resetAllMocks());

  it('creates a User and returns only its domain fields, even when the row has extra columns', async () => {
    prisma.user.create.mockResolvedValue({ ...ANA, futureColumn: 'x' });
    const data = {
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: 'salt:key',
    };

    await expect(repository.create(data)).resolves.toEqual(ANA);
    expect(prisma.user.create).toHaveBeenCalledWith({ data });
  });

  describe('translates Prisma errors, keeping the original as cause', () => {
    const calls = {
      create: () =>
        repository.create({
          name: 'Ana',
          email: 'ana@example.com',
          passwordHash: 'h',
        }),
      findById: () => repository.findById(1),
      findByEmail: () => repository.findByEmail('ana@example.com'),
      update: () => repository.update(1, { email: 'ana@example.com' }),
    };
    const prismaCall = {
      create: prisma.user.create,
      findById: prisma.user.findUnique,
      findByEmail: prisma.user.findUnique,
      update: prisma.user.update,
    };

    it.each([
      ['create', 'P2002', ConflictError],
      ['update', 'P2002', ConflictError],
      ['update', 'P2025', NotFoundError],
    ] as const)('%s: %s into %p', async (method, code, domainError) => {
      const cause = knownError(code);
      prismaCall[method].mockRejectedValue(cause);

      const error = await calls[method]().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(domainError);
      expect(error).toHaveProperty('cause', cause);
    });

    it.each(
      Object.keys(calls).flatMap((method) => [
        [method, knownError('P1001')],
        [method, new Error('connection refused at 10.0.0.1')],
      ]) as [keyof typeof calls, Error][],
    )(
      '%s: anything else into DatabaseOperationError (%p)',
      async (method, cause) => {
        prismaCall[method].mockRejectedValue(cause);

        const error = await calls[method]().catch((e: unknown) => e);

        expect(error).toBeInstanceOf(DatabaseOperationError);
        expect(error).toHaveProperty('cause', cause);
        expect((error as Error).message).not.toContain(cause.message);
      },
    );
  });
});
