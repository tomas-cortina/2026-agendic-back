import { ConflictError, DatabaseOperationError, NotFoundError } from '../../../domain/errors';
import { Service } from '../../../domain/services/service';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import { PrismaServicesRepository } from '../prisma-services.repository';

const SERVICE_ROW = {
  id: 1,
  businessId: 1,
  name: 'Haircut',
  description: 'A basic haircut',
  durationMinutes: 30,
  price: '20', // Prisma returns Decimal columns as a Decimal-like; Number() reads a numeric string just as well
  retiredAt: null,
};

const SERVICE: Service = {
  id: 1,
  businessId: 1,
  name: 'Haircut',
  description: 'A basic haircut',
  durationMinutes: 30,
  price: 20,
  retiredAt: null,
};

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('vendor message', {
    code,
    clientVersion: '7.10.0',
  });

describe('PrismaServicesRepository', () => {
  const prisma = {
    service: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const repository = new PrismaServicesRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => jest.resetAllMocks());

  it('creates a Service, converting its Decimal price to a number', async () => {
    prisma.service.create.mockResolvedValue(SERVICE_ROW);

    await expect(
      repository.create({
        businessId: 1,
        name: 'Haircut',
        description: 'A basic haircut',
        durationMinutes: 30,
        price: 20,
      }),
    ).resolves.toEqual(SERVICE);
  });

  it('lists only active Services of a Business', async () => {
    prisma.service.findMany.mockResolvedValue([SERVICE_ROW]);

    await expect(repository.listActiveByBusiness(1)).resolves.toEqual([
      SERVICE,
    ]);
    expect(prisma.service.findMany).toHaveBeenCalledWith({
      where: { businessId: 1, retiredAt: null },
    });
  });

  it('retires a Service by setting retiredAt', async () => {
    const retiredAt = new Date('2026-02-01T00:00:00.000Z');
    prisma.service.update.mockResolvedValue({ ...SERVICE_ROW, retiredAt });

    await repository.retire(1, retiredAt);

    expect(prisma.service.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { retiredAt },
    });
  });

  describe('translates Prisma errors, keeping the original as cause', () => {
    const calls = {
      create: () =>
        repository.create({
          businessId: 1,
          name: 'Haircut',
          description: null,
          durationMinutes: 30,
          price: 20,
        }),
      findById: () => repository.findById(1),
      update: () => repository.update(1, { name: 'New name' }),
    };
    const prismaCall = {
      create: prisma.service.create,
      findById: prisma.service.findUnique,
      update: prisma.service.update,
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
