import { createHash } from 'node:crypto';
import { Employee } from '../../../domain/employees/employee';
import {
  BusinessRuleError,
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../../domain/errors';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import { PrismaEmployeesRepository } from '../prisma-employees.repository';

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('base64url');

const EMPLOYEE: Employee = {
  id: 1,
  businessId: 1,
  name: 'Ana Pérez',
  email: 'ana@example.com',
  emailVerifiedAt: new Date('2026-01-01T12:00:00.000Z'),
  retiredAt: null,
};

const EXPIRES_AT = new Date('2026-01-02T12:00:00.000Z');
const NOW = new Date('2026-01-01T12:00:00.000Z');

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('vendor message', {
    code,
    clientVersion: '7.10.0',
  });

describe('PrismaEmployeesRepository', () => {
  const prisma = {
    employee: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const repository = new PrismaEmployeesRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => jest.resetAllMocks());

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
    prisma.employee.create.mockResolvedValue({
      ...EMPLOYEE,
      emailVerifiedAt: null,
    });
    const data = {
      businessId: 1,
      name: 'Ana Pérez',
      email: 'ana@example.com',
      emailVerifiedAt: null,
    };

    await expect(repository.create(data)).resolves.toEqual({
      ...EMPLOYEE,
      emailVerifiedAt: null,
    });
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

  describe('issueVerificationToken', () => {
    it('stores only the SHA-256 of a random token and returns the raw token', async () => {
      prisma.employee.update.mockResolvedValue(EMPLOYEE);

      const token = await repository.issueVerificationToken(1, EXPIRES_AT);

      expect(typeof token).toBe('string');
      expect(prisma.employee.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          verificationTokenHash: sha256(token),
          verificationTokenExpiresAt: EXPIRES_AT,
        },
      });
    });
  });

  describe('verifyEmail', () => {
    it('marks the Employee verified by the hash of the token, clearing it', async () => {
      prisma.employee.findUnique.mockResolvedValue({
        ...EMPLOYEE,
        emailVerifiedAt: null,
        verificationTokenHash: sha256('a-token'),
        verificationTokenExpiresAt: EXPIRES_AT,
      });
      prisma.employee.update.mockResolvedValue({
        ...EMPLOYEE,
        emailVerifiedAt: NOW,
      });

      await expect(repository.verifyEmail('a-token', NOW)).resolves.toEqual({
        ...EMPLOYEE,
        emailVerifiedAt: NOW,
      });
      expect(prisma.employee.findUnique).toHaveBeenCalledWith({
        where: { verificationTokenHash: sha256('a-token') },
      });
      expect(prisma.employee.update).toHaveBeenCalledWith({
        where: { id: EMPLOYEE.id },
        data: {
          emailVerifiedAt: NOW,
          verificationTokenHash: null,
          verificationTokenExpiresAt: null,
        },
      });
    });

    it.each([
      ['an unknown token', null],
      [
        'an expired token',
        {
          ...EMPLOYEE,
          verificationTokenHash: sha256('a-token'),
          verificationTokenExpiresAt: NOW,
        },
      ],
    ])('throws BusinessRuleError for %s', async (_, row) => {
      prisma.employee.findUnique.mockResolvedValue(row);

      await expect(
        repository.verifyEmail('a-token', NOW),
      ).rejects.toBeInstanceOf(BusinessRuleError);
      expect(prisma.employee.update).not.toHaveBeenCalled();
    });
  });

  describe('translates Prisma errors, keeping the original as cause', () => {
    const calls = {
      create: () =>
        repository.create({
          businessId: 1,
          name: 'Ana',
          email: 'ana@example.com',
          emailVerifiedAt: null,
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
