import { Business } from '../../../domain/businesses/business';
import {
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../../domain/errors';
import { ServiceCategory } from '../../../domain/services/service';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import { PrismaBusinessesRepository } from '../prisma-businesses.repository';

const ANAS_BUSINESS: Business = {
  id: 1,
  name: "Ana's Salon",
  description: 'Hair and nails',
  ownerId: 1,
  clerkOrgId: 'org_clerk_anas_salon',
};

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('vendor message', {
    code,
    clientVersion: '7.10.0',
  });

const BRANCH_ROW = {
  id: 10,
  businessId: ANAS_BUSINESS.id,
  name: 'Downtown',
  address: '123 Main St',
  opensAt: new Date('1970-01-01T09:00:00.000Z'),
  closesAt: new Date('1970-01-01T18:00:00.000Z'),
};

const EMPLOYEE_ROW = {
  id: 20,
  businessId: ANAS_BUSINESS.id,
  clerkId: 'user_clerk_ana',
  name: 'Ana Pérez',
  email: 'ana@example.com',
  retiredAt: null,
};

const SERVICE_ROW = {
  id: 30,
  branchId: BRANCH_ROW.id,
  name: 'Haircut',
  description: 'A basic haircut',
  category: ServiceCategory.SPA,
  durationMinutes: 30,
  price: '20',
  retiredAt: null,
  employees: [{ id: EMPLOYEE_ROW.id, name: EMPLOYEE_ROW.name }],
};

const CREATE_DATA = {
  business: {
    name: ANAS_BUSINESS.name,
    description: ANAS_BUSINESS.description,
    ownerId: ANAS_BUSINESS.ownerId,
    clerkOrgId: ANAS_BUSINESS.clerkOrgId,
  },
  branch: {
    name: 'Downtown',
    address: '123 Main St',
    opensAt: '09:00',
    closesAt: '18:00',
  },
  service: {
    name: 'Haircut',
    description: 'A basic haircut',
    category: ServiceCategory.SPA,
    durationMinutes: 30,
    price: 20,
  },
  employee: {
    clerkId: 'user_clerk_ana',
    name: 'Ana Pérez',
    email: 'ana@example.com',
  },
};

describe('PrismaBusinessesRepository', () => {
  const tx = {
    business: { create: jest.fn() },
    branch: { create: jest.fn() },
    employee: { create: jest.fn() },
    service: { create: jest.fn() },
  };
  const prisma = {
    business: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    // Interactive transaction: whatever the callback writes is committed together, or nothing is.
    $transaction: jest.fn((run: (client: typeof tx) => unknown) => run(tx)),
  };
  const repository = new PrismaBusinessesRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((run) => run(tx));
  });

  it('creates the Business, its Branch, its Service and the owner as its Employee, in one transaction', async () => {
    tx.business.create.mockResolvedValue({ ...ANAS_BUSINESS, futureColumn: 'x' });
    tx.branch.create.mockResolvedValue(BRANCH_ROW);
    tx.employee.create.mockResolvedValue(EMPLOYEE_ROW);
    tx.service.create.mockResolvedValue(SERVICE_ROW);

    const created = await repository.create(CREATE_DATA);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(created.business).toEqual(ANAS_BUSINESS);
    expect(created.branch).toEqual({
      id: BRANCH_ROW.id,
      businessId: ANAS_BUSINESS.id,
      name: 'Downtown',
      address: '123 Main St',
      opensAt: '09:00',
      closesAt: '18:00',
    });
    expect(created.employee).toEqual({
      id: EMPLOYEE_ROW.id,
      businessId: ANAS_BUSINESS.id,
      clerkId: 'user_clerk_ana',
      name: 'Ana Pérez',
      email: 'ana@example.com',
      retiredAt: null,
    });
    expect(created.service).toEqual({
      id: SERVICE_ROW.id,
      branchId: BRANCH_ROW.id,
      name: 'Haircut',
      description: 'A basic haircut',
      category: ServiceCategory.SPA,
      durationMinutes: 30,
      price: 20,
      retiredAt: null,
      employees: [{ id: EMPLOYEE_ROW.id, name: EMPLOYEE_ROW.name }],
    });
  });

  it('puts the new Employee in charge of the new Service', async () => {
    tx.business.create.mockResolvedValue(ANAS_BUSINESS);
    tx.branch.create.mockResolvedValue(BRANCH_ROW);
    tx.employee.create.mockResolvedValue(EMPLOYEE_ROW);
    tx.service.create.mockResolvedValue(SERVICE_ROW);

    await repository.create(CREATE_DATA);

    expect(tx.service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          branchId: BRANCH_ROW.id,
          employees: { connect: { id: EMPLOYEE_ROW.id } },
        }),
      }),
    );
  });

  it.each([
    ['Service_branchId_name_ci_key', 'Service name already in use'],
    ['Employee_businessId_email_ci_key', 'Employee email already in use'],
    [undefined, 'Service name or Employee email already in use'],
  ])(
    'names the violated index %s in the ConflictError it throws',
    async (index, message) => {
      tx.business.create.mockResolvedValue(ANAS_BUSINESS);
      tx.branch.create.mockResolvedValue(BRANCH_ROW);
      tx.employee.create.mockResolvedValue(EMPLOYEE_ROW);
      const cause = knownError('P2002');
      // Where ADR 0004 says @prisma/adapter-pg puts the violated index's name.
      cause.meta = index
        ? { driverAdapterError: { cause: { constraint: { index } } } }
        : undefined;
      tx.service.create.mockRejectedValue(cause);

      const error = await repository
        .create(CREATE_DATA)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toHaveProperty('message', message);
      expect(error).toHaveProperty('cause', cause);
    },
  );

  it('writes nothing when a later part of the transaction fails', async () => {
    tx.business.create.mockResolvedValue(ANAS_BUSINESS);
    tx.branch.create.mockResolvedValue(BRANCH_ROW);
    tx.employee.create.mockResolvedValue(EMPLOYEE_ROW);
    const cause = knownError('P2002');
    tx.service.create.mockRejectedValue(cause);

    // The rollback itself is Postgres's job; what this pins is that the writes all sit inside the one callback.
    await expect(repository.create(CREATE_DATA)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('lists Businesses', async () => {
    prisma.business.findMany.mockResolvedValue([ANAS_BUSINESS]);

    await expect(repository.list()).resolves.toEqual([ANAS_BUSINESS]);
  });

  it('finds a Business by its Clerk Organization id', async () => {
    prisma.business.findUnique.mockResolvedValue(ANAS_BUSINESS);

    await expect(
      repository.findByClerkOrgId(ANAS_BUSINESS.clerkOrgId),
    ).resolves.toEqual(ANAS_BUSINESS);
    expect(prisma.business.findUnique).toHaveBeenCalledWith({
      where: { clerkOrgId: ANAS_BUSINESS.clerkOrgId },
    });
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
