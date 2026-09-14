import { createHash } from 'node:crypto';
import { DatabaseOperationError } from '../../../domain/errors';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import { PrismaSessionsRepository } from '../prisma-sessions.repository';

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('base64url');

const EXPIRES_AT = new Date('2026-01-31T12:00:00.000Z');

describe('PrismaSessionsRepository', () => {
  const prisma = {
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const repository = new PrismaSessionsRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => jest.resetAllMocks());

  it('stores only the SHA-256 of the Sesión id, and returns the raw id', async () => {
    prisma.session.create.mockImplementation(async ({ data }) => data);

    const session = await repository.create({
      userId: 1,
      expiresAt: EXPIRES_AT,
    });

    expect(session).toEqual({
      id: expect.any(String),
      userId: 1,
      expiresAt: EXPIRES_AT,
    });
    expect(prisma.session.create).toHaveBeenCalledWith({
      data: { id: sha256(session.id), userId: 1, expiresAt: EXPIRES_AT },
    });
  });

  it('finds a Sesión by the hash of its id, and returns the raw id and only domain fields', async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: sha256('session-1'),
      userId: 1,
      expiresAt: EXPIRES_AT,
      futureColumn: 'x',
    });

    await expect(repository.findById('session-1')).resolves.toEqual({
      id: 'session-1',
      userId: 1,
      expiresAt: EXPIRES_AT,
    });
    expect(prisma.session.findUnique).toHaveBeenCalledWith({
      where: { id: sha256('session-1') },
    });
  });

  it('returns null for an unknown Sesión', async () => {
    prisma.session.findUnique.mockResolvedValue(null);

    await expect(repository.findById('session-1')).resolves.toBeNull();
  });

  it('deletes by the hash of the id, without failing when the Sesión is already gone', async () => {
    prisma.session.deleteMany.mockResolvedValue({ count: 0 });

    await expect(repository.delete('session-1')).resolves.toBeUndefined();
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { id: sha256('session-1') },
    });
  });

  describe('wraps every error in DatabaseOperationError, keeping the original as cause', () => {
    const calls = {
      create: [
        prisma.session.create,
        () => repository.create({ userId: 1, expiresAt: EXPIRES_AT }),
      ],
      findById: [prisma.session.findUnique, () => repository.findById('s')],
      delete: [prisma.session.deleteMany, () => repository.delete('s')],
    } as const;

    it.each(
      Object.keys(calls).flatMap((method) => [
        [method, knownError('P2003')],
        [method, new Error('connection refused at 10.0.0.1')],
      ]) as [keyof typeof calls, Error][],
    )('%s: %p', async (method, cause) => {
      const [prismaCall, call] = calls[method];
      prismaCall.mockRejectedValue(cause);

      const error = await call().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(DatabaseOperationError);
      expect(error).toHaveProperty('cause', cause);
      expect((error as Error).message).not.toContain(cause.message);
    });
  });
});

function knownError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('vendor message', {
    code,
    clientVersion: '7.10.0',
  });
}
