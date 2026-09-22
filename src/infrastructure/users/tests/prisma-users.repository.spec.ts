import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../../domain/errors';
import { User } from '../../../domain/users/user';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import { PrismaUsersRepository } from '../prisma-users.repository';

const ANA: User = {
  id: 1,
  clerkId: 'user_clerk_1',
  name: 'Ana',
  email: 'ana@example.com',
  createdAt: new Date('2026-01-01T12:00:00.000Z'),
};

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('vendor message', {
    code,
    clientVersion: '7.10.0',
  });

describe('PrismaUsersRepository', () => {
  const prisma = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const repository = new PrismaUsersRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => jest.resetAllMocks());

  it('creates a User and returns only its domain fields, even when the row has extra columns', async () => {
    prisma.user.create.mockResolvedValue({ ...ANA, futureColumn: 'x' });
    const data = {
      clerkId: 'user_clerk_1',
      name: 'Ana',
      email: 'ana@example.com',
    };

    await expect(repository.create(data)).resolves.toEqual(ANA);
    expect(prisma.user.create).toHaveBeenCalledWith({ data });
  });

  it('finds by id', async () => {
    prisma.user.findUnique.mockResolvedValue(ANA);

    await expect(repository.findById(1)).resolves.toEqual(ANA);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('finds by Clerk id', async () => {
    prisma.user.findUnique.mockResolvedValue(ANA);

    await expect(repository.findByClerkId('user_clerk_1')).resolves.toEqual(
      ANA,
    );
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { clerkId: 'user_clerk_1' },
    });
  });

  it('finds by email', async () => {
    prisma.user.findFirst.mockResolvedValue(ANA);

    await expect(repository.findByEmail('ana@example.com')).resolves.toEqual(
      ANA,
    );
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: 'ana@example.com' },
    });
  });

  it('updates only the name', async () => {
    prisma.user.update.mockResolvedValue(ANA);

    await expect(repository.update(1, { name: 'Ana María' })).resolves.toEqual(
      ANA,
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: 'Ana María' },
    });
  });

  describe('translates Prisma errors, keeping the original as cause', () => {
    const calls = {
      create: () =>
        repository.create({
          clerkId: 'user_clerk_1',
          name: 'Ana',
          email: 'ana@example.com',
        }),
      findById: () => repository.findById(1),
      update: () => repository.update(1, { name: 'Ana' }),
    };
    const prismaCall = {
      create: prisma.user.create,
      findById: prisma.user.findUnique,
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
