import {
  ConflictError,
  DatabaseOperationError,
  ExpiredError,
  InvalidCodeError,
  NotFoundError,
} from '../../../domain/errors';
import { Role, User } from '../../../domain/users/user';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import { CODE_PATTERN, hashVerificationCode } from '../../verification-code';
import { PrismaUsersRepository } from '../prisma-users.repository';

const ANA: User = {
  id: 1,
  name: 'Ana',
  email: 'ana@example.com',
  pendingEmail: null,
  passwordHash: 'salt:key',
  role: Role.USER,
  emailVerifiedAt: null,
  createdAt: new Date('2026-01-01T12:00:00.000Z'),
};

const EXPIRES_AT = new Date('2026-01-02T12:00:00.000Z');
const NOW = new Date('2026-01-01T12:00:00.000Z');

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
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: 'salt:key',
    };

    await expect(repository.create(data)).resolves.toEqual(ANA);
    expect(prisma.user.create).toHaveBeenCalledWith({ data });
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

  describe('setPendingEmail', () => {
    it('stores the email as pending when nobody else has it', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue({
        ...ANA,
        pendingEmail: 'new@example.com',
      });

      await expect(
        repository.setPendingEmail(1, 'new@example.com'),
      ).resolves.toEqual({ ...ANA, pendingEmail: 'new@example.com' });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'new@example.com' },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { pendingEmail: 'new@example.com' },
      });
    });

    it('throws ConflictError when the email already belongs to a User', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...ANA, id: 2 });

      await expect(
        repository.setPendingEmail(1, 'ana@example.com'),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('issueVerificationCode', () => {
    it('stores only the SHA-256 of a 6-character code and returns the raw code', async () => {
      prisma.user.update.mockResolvedValue(ANA);

      const code = await repository.issueVerificationCode(1, EXPIRES_AT);

      expect(code).toMatch(CODE_PATTERN);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          verificationCodeHash: hashVerificationCode(code),
          verificationCodeExpiresAt: EXPIRES_AT,
        },
      });
    });
  });

  describe('verifyEmail', () => {
    it('marks the User verified by the email and the hash of the code, clearing it', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...ANA,
        pendingEmail: null,
        verificationCodeHash: hashVerificationCode('ABCDEF'),
        verificationCodeExpiresAt: EXPIRES_AT,
      });
      prisma.user.update.mockResolvedValue({ ...ANA, emailVerifiedAt: NOW });

      await expect(
        repository.verifyEmail('ana@example.com', 'ABCDEF', NOW),
      ).resolves.toEqual({
        ...ANA,
        emailVerifiedAt: NOW,
      });
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: 'ana@example.com' },
            { pendingEmail: 'ana@example.com' },
          ],
          verificationCodeHash: hashVerificationCode('ABCDEF'),
        },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: ANA.id },
        data: {
          email: ANA.email,
          pendingEmail: null,
          emailVerifiedAt: NOW,
          verificationCodeHash: null,
          verificationCodeExpiresAt: null,
        },
      });
    });

    it('applies the pending email instead, when one was set', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...ANA,
        pendingEmail: 'new@example.com',
        verificationCodeHash: hashVerificationCode('ABCDEF'),
        verificationCodeExpiresAt: EXPIRES_AT,
      });
      prisma.user.update.mockResolvedValue(ANA);

      await repository.verifyEmail('new@example.com', 'ABCDEF', NOW);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: ANA.id },
        data: {
          email: 'new@example.com',
          pendingEmail: null,
          emailVerifiedAt: NOW,
          verificationCodeHash: null,
          verificationCodeExpiresAt: null,
        },
      });
    });

    it('throws ConflictError when the pending email was registered by someone else meanwhile', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...ANA,
        pendingEmail: 'new@example.com',
        verificationCodeHash: hashVerificationCode('ABCDEF'),
        verificationCodeExpiresAt: EXPIRES_AT,
      });
      prisma.user.update.mockRejectedValue(knownError('P2002'));

      await expect(
        repository.verifyEmail('new@example.com', 'ABCDEF', NOW),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it('throws InvalidCodeError for an unknown code', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        repository.verifyEmail('ana@example.com', 'ABCDEF', NOW),
      ).rejects.toBeInstanceOf(InvalidCodeError);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('throws ExpiredError for an expired code', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...ANA,
        verificationCodeHash: hashVerificationCode('ABCDEF'),
        verificationCodeExpiresAt: NOW,
      });

      await expect(
        repository.verifyEmail('ana@example.com', 'ABCDEF', NOW),
      ).rejects.toBeInstanceOf(ExpiredError);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
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
      update: () => repository.update(1, { name: 'Ana' }),
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
