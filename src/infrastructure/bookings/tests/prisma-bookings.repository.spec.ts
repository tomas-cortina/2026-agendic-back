import { BookingStatus } from '../../../domain/bookings/booking';
import {
  BusinessRuleError,
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../../domain/errors';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import { PrismaBookingsRepository } from '../prisma-bookings.repository';

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('vendor message', {
    code,
    clientVersion: '7.10.0',
  });

const BOOKING_ROW = {
  id: 1,
  serviceId: 1,
  employeeId: 1,
  clientName: 'Bruno Díaz',
  clientEmail: 'bruno@example.com',
  startsAt: new Date('2026-01-01T12:00:00.000Z'),
  endsAt: new Date('2026-01-01T12:30:00.000Z'),
  status: BookingStatus.UNVERIFIED,
  verificationTokenHash: 'hash',
  verificationTokenExpiresAt: new Date('2026-01-02T12:00:00.000Z'),
  createdAt: new Date('2026-01-01T12:00:00.000Z'),
};

describe('PrismaBookingsRepository', () => {
  const prisma = {
    booking: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const repository = new PrismaBookingsRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => jest.resetAllMocks());

  it('translates the overlap exclusion violation into ConflictError on markBooked', async () => {
    const cause = knownError('P2039');
    cause.meta = { driverAdapterError: { cause: { originalCode: '23P01' } } };
    prisma.booking.update.mockRejectedValue(cause);

    const error = await repository.markBooked(1).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error).toHaveProperty('cause', cause);
  });

  it('recognises the violation by the constraint name when the driver meta is absent', async () => {
    const cause = knownError('P2039');
    cause.message = 'exclusion constraint "Booking_no_overlap" violated';
    prisma.booking.update.mockRejectedValue(cause);

    const error = await repository.markBooked(1).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictError);
  });

  it('finds a Booking by its verification token hash and returns it', async () => {
    prisma.booking.findFirst.mockResolvedValue(BOOKING_ROW);

    const booking = await repository.findByVerificationToken(
      'a-token',
      new Date('2026-01-01T12:00:00.000Z'),
    );

    expect(booking).toEqual({
      id: BOOKING_ROW.id,
      serviceId: BOOKING_ROW.serviceId,
      employeeId: BOOKING_ROW.employeeId,
      clientName: BOOKING_ROW.clientName,
      clientEmail: BOOKING_ROW.clientEmail,
      startsAt: BOOKING_ROW.startsAt,
      endsAt: BOOKING_ROW.endsAt,
      status: BOOKING_ROW.status,
    });
  });

  it.each([
    ['an unknown token', null],
    ['an expired token', { ...BOOKING_ROW, verificationTokenExpiresAt: new Date('2026-01-01T11:00:00.000Z') }],
    ['a used token', { ...BOOKING_ROW, verificationTokenExpiresAt: null }],
  ])('throws BusinessRuleError for %s', async (_, row) => {
    prisma.booking.findFirst.mockResolvedValue(row);

    await expect(
      repository.findByVerificationToken(
        'a-token',
        new Date('2026-01-01T12:00:00.000Z'),
      ),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('reports whether a BOOKED Booking overlaps the given window', async () => {
    prisma.booking.findFirst.mockResolvedValue(BOOKING_ROW);

    const overlaps = await repository.hasOverlappingBooked(
      1,
      new Date('2026-01-01T12:00:00.000Z'),
      new Date('2026-01-01T12:30:00.000Z'),
    );

    expect(overlaps).toBe(true);
    expect(prisma.booking.findFirst).toHaveBeenCalledWith({
      where: {
        employeeId: 1,
        status: BookingStatus.BOOKED,
        startsAt: { lt: new Date('2026-01-01T12:30:00.000Z') },
        endsAt: { gt: new Date('2026-01-01T12:00:00.000Z') },
      },
    });
  });

  describe('translates other Prisma errors, keeping the original as cause', () => {
    it('P2025 on markBooked into NotFoundError', async () => {
      const cause = knownError('P2025');
      prisma.booking.update.mockRejectedValue(cause);

      const error = await repository.markBooked(1).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).toHaveProperty('cause', cause);
    });

    it('anything else into DatabaseOperationError', async () => {
      const cause = new Error('connection refused at 10.0.0.1');
      prisma.booking.update.mockRejectedValue(cause);

      const error = await repository.markBooked(1).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(DatabaseOperationError);
      expect(error).toHaveProperty('cause', cause);
    });
  });
});
