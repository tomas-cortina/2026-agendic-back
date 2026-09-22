import { Employee } from '../../../domain/employees/employee';
import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../../domain/errors';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import { PrismaEmployeesRepository } from '../prisma-employees.repository';

const EMPLOYEE: Employee = {
  id: 1,
  businessId: 1,
  clerkId: 'user_clerk_ana',
  name: 'Ana Pérez',
  email: 'ana@example.com',
  retiredAt: null,
};

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('vendor message', {
    code,
    clientVersion: '7.10.0',
  });

describe('PrismaEmployeesRepository', () => {
  const tx = {
    employee: { update: jest.fn() },
    booking: { updateMany: jest.fn() },
  };
  const prisma = {
    employee: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((run: (client: typeof tx) => unknown) => run(tx)),
  };
  const repository = new PrismaEmployeesRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((run) => run(tx));
  });

  it('lists Employees by id, returning only their domain fields', async () => {
    prisma.employee.findMany.mockResolvedValue([
      { ...EMPLOYEE, futureColumn: 'x' },
    ]);

    await expect(repository.listByIds([1, 2])).resolves.toEqual([EMPLOYEE]);
    expect(prisma.employee.findMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] } },
    });
  });

  it('returns nothing for ids that do not exist, rather than failing', async () => {
    prisma.employee.findMany.mockResolvedValue([]);

    await expect(repository.listByIds([999])).resolves.toEqual([]);
  });

  it('creates an Employee and returns only its domain fields', async () => {
    prisma.employee.create.mockResolvedValue(EMPLOYEE);
    const data = {
      businessId: 1,
      clerkId: 'user_clerk_ana',
      name: 'Ana Pérez',
      email: 'ana@example.com',
    };

    await expect(repository.create(data)).resolves.toEqual(EMPLOYEE);
    expect(prisma.employee.create).toHaveBeenCalledWith({ data });
  });

  it('finds an Employee by id', async () => {
    prisma.employee.findUnique.mockResolvedValue(EMPLOYEE);

    await expect(repository.findById(1)).resolves.toEqual(EMPLOYEE);
    expect(prisma.employee.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it('returns null when the Employee does not exist', async () => {
    prisma.employee.findUnique.mockResolvedValue(null);

    await expect(repository.findById(999)).resolves.toBeNull();
  });

  it('finds an Employee by Clerk id', async () => {
    prisma.employee.findUnique.mockResolvedValue(EMPLOYEE);

    await expect(repository.findByClerkId('user_clerk_ana')).resolves.toEqual(
      EMPLOYEE,
    );
    expect(prisma.employee.findUnique).toHaveBeenCalledWith({
      where: { clerkId: 'user_clerk_ana' },
    });
  });

  it('lists a Business Employees not dados de baja', async () => {
    prisma.employee.findMany.mockResolvedValue([EMPLOYEE]);

    await expect(repository.listActiveByBusiness(1)).resolves.toEqual([
      EMPLOYEE,
    ]);
    expect(prisma.employee.findMany).toHaveBeenCalledWith({
      where: { businessId: 1, retiredAt: null },
    });
  });

  it('updates only the name', async () => {
    prisma.employee.update.mockResolvedValue(EMPLOYEE);

    await expect(repository.update(1, { name: 'Ana María' })).resolves.toEqual(
      EMPLOYEE,
    );
    expect(prisma.employee.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: 'Ana María' },
    });
  });

  describe('retire', () => {
    const retiredAt = new Date('2026-02-01T00:00:00.000Z');

    it('sets retiredAt, takes the Employee off every Service, and cancels their future BOOKED Turnos, atomically', async () => {
      tx.employee.update.mockResolvedValue({ ...EMPLOYEE, retiredAt });
      tx.booking.updateMany.mockResolvedValue({ count: 4 });

      await expect(repository.retire(1, retiredAt)).resolves.toEqual({
        employee: { ...EMPLOYEE, retiredAt },
        cancelledBookings: 4,
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.employee.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { retiredAt, services: { set: [] } },
      });
      expect(tx.booking.updateMany).toHaveBeenCalledWith({
        where: {
          employeeId: 1,
          status: 'BOOKED',
          startsAt: { gt: retiredAt },
        },
        data: { status: 'CANCELLED' },
      });
    });
  });

  describe('translates Prisma errors, keeping the original as cause', () => {
    const calls = {
      create: () =>
        repository.create({
          businessId: 1,
          clerkId: 'user_clerk_ana',
          name: 'Ana',
          email: 'ana@example.com',
        }),
      findById: () => repository.findById(1),
      update: () => repository.update(1, { name: 'Ana' }),
    };
    const prismaCall = {
      create: prisma.employee.create,
      findById: prisma.employee.findUnique,
      update: prisma.employee.update,
    };

    it.each([
      ['create', 'P2002', ConflictError],
      ['update', 'P2025', NotFoundError],
    ] as const)('%s: %s into %p', async (method, code, domainError) => {
      const cause = knownError(code);
      prismaCall[method].mockRejectedValue(cause);

      const error = await calls[method]().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(domainError);
      expect(error).toHaveProperty('cause', cause);
    });

    it('translates a database failure, keeping the original as cause', async () => {
      const cause = new Error('connection refused at 10.0.0.1');
      prisma.employee.findMany.mockRejectedValue(cause);

      const error = await repository.listByIds([1]).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(DatabaseOperationError);
      expect(error).toHaveProperty('cause', cause);
      expect((error as Error).message).not.toContain(cause.message);
    });
  });
});
