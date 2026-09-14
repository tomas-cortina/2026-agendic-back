import { Business } from '../../../domain/businesses/business';
import { DatabaseOperationError, NotFoundError } from '../../../domain/errors';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import { PrismaBusinessesRepository } from '../prisma-businesses.repository';

const ANAS_BUSINESS: Business = {
  id: 1,
  name: "Ana's Salon",
  description: 'Hair and nails',
  ownerId: 1,
};

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('vendor message', {
    code,
    clientVersion: '7.10.0',
  });

describe('PrismaBusinessesRepository', () => {
  const prisma = {
    business: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const repository = new PrismaBusinessesRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => jest.resetAllMocks());

  it('creates a Business and returns only its domain fields, even when the row has extra columns', async () => {
    prisma.business.create.mockResolvedValue({
      ...ANAS_BUSINESS,
      futureColumn: 'x',
    });
    const data = {
      name: ANAS_BUSINESS.name,
      description: ANAS_BUSINESS.description,
      ownerId: ANAS_BUSINESS.ownerId,
    };

    await expect(repository.create(data)).resolves.toEqual(ANAS_BUSINESS);
    expect(prisma.business.create).toHaveBeenCalledWith({ data });
  });

  it('lists Businesses', async () => {
    prisma.business.findMany.mockResolvedValue([ANAS_BUSINESS]);

    await expect(repository.list()).resolves.toEqual([ANAS_BUSINESS]);
  });

  describe('translates Prisma errors, keeping the original as cause', () => {
    const calls = {
      findById: () => repository.findById(1),
      update: () => repository.update(1, { name: 'New name' }),
    };
    const prismaCall = {
      findById: prisma.business.findUnique,
      update: prisma.business.update,
    };

    it.each([['update', 'P2025', NotFoundError]] as const)(
      '%s: %s into %p',
      async (method, code, domainError) => {
        const cause = knownError(code);
        prismaCall[method].mockRejectedValue(cause);

        const error = await calls[method]().catch((e: unknown) => e);

        expect(error).toBeInstanceOf(domainError);
        expect(error).toHaveProperty('cause', cause);
      },
    );

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
