import { Employee } from '../../../domain/employees/employee';
import { DatabaseOperationError } from '../../../domain/errors';
import { PrismaService } from '../../prisma.service';
import { PrismaEmployeesRepository } from '../prisma-employees.repository';

const EMPLOYEE: Employee = {
  id: 1,
  businessId: 1,
  name: 'Ana Pérez',
  email: 'ana@example.com',
  emailVerifiedAt: new Date('2026-01-01T12:00:00.000Z'),
  retiredAt: null,
};

describe('PrismaEmployeesRepository', () => {
  const prisma = { employee: { findMany: jest.fn() } };
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

  it('translates a database failure, keeping the original as cause', async () => {
    const cause = new Error('connection refused at 10.0.0.1');
    prisma.employee.findMany.mockRejectedValue(cause);

    const error = await repository.listByIds([1]).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DatabaseOperationError);
    expect(error).toHaveProperty('cause', cause);
    expect((error as Error).message).not.toContain(cause.message);
  });
});
