import { Branch } from '../../../domain/branches/branch';
import { DatabaseOperationError, NotFoundError } from '../../../domain/errors';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import { PrismaBranchesRepository } from '../prisma-branches.repository';

const BRANCH: Branch = {
  id: 1,
  businessId: 1,
  name: 'Downtown',
  address: '123 Main St',
  opensAt: '09:00',
  closesAt: '18:00',
};

const BRANCH_ROW = {
  id: 1,
  businessId: 1,
  name: 'Downtown',
  address: '123 Main St',
  opensAt: new Date('1970-01-01T09:00:00.000Z'),
  closesAt: new Date('1970-01-01T18:00:00.000Z'),
};

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('vendor message', {
    code,
    clientVersion: '7.10.0',
  });

describe('PrismaBranchesRepository', () => {
  const prisma = {
    branch: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const repository = new PrismaBranchesRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => jest.resetAllMocks());

  it('creates a Branch, converting HH:mm hours to Prisma Time values', async () => {
    prisma.branch.create.mockResolvedValue(BRANCH_ROW);

    await expect(
      repository.create({
        businessId: 1,
        name: 'Downtown',
        address: '123 Main St',
        opensAt: '09:00',
        closesAt: '18:00',
      }),
    ).resolves.toEqual(BRANCH);
    expect(prisma.branch.create).toHaveBeenCalledWith({
      data: {
        businessId: 1,
        name: 'Downtown',
        address: '123 Main St',
        opensAt: new Date('1970-01-01T09:00:00.000Z'),
        closesAt: new Date('1970-01-01T18:00:00.000Z'),
      },
    });
  });

  it('reads a Branch, converting Prisma Time values back to HH:mm', async () => {
    prisma.branch.findUnique.mockResolvedValue(BRANCH_ROW);

    await expect(repository.findById(1)).resolves.toEqual(BRANCH);
  });

  it('lists Branches by Business', async () => {
    prisma.branch.findMany.mockResolvedValue([BRANCH_ROW]);

    await expect(repository.listByBusiness(1)).resolves.toEqual([BRANCH]);
  });

  it('updates only the given fields, converting hours when present', async () => {
    prisma.branch.update.mockResolvedValue(BRANCH_ROW);

    await repository.update(1, { name: 'New name' });

    expect(prisma.branch.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        name: 'New name',
        address: undefined,
        opensAt: undefined,
        closesAt: undefined,
      },
    });
  });

  describe('translates Prisma errors, keeping the original as cause', () => {
    const calls = {
      findById: () => repository.findById(1),
      update: () => repository.update(1, { name: 'New name' }),
    };
    const prismaCall = {
      findById: prisma.branch.findUnique,
      update: prisma.branch.update,
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
