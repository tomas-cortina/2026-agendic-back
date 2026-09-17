import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Booking, BookingStatus } from '../../domain/bookings/booking';
import {
  BookingsRepository,
  CreateBookingData,
} from '../../domain/bookings/bookings.repository';
import {
  BusinessRuleError,
  ConflictError,
  DatabaseOperationError,
  NotFoundError,
} from '../../domain/errors';
import { Booking as BookingRow, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

/** Stores only a hash of each verification token, so a leaked table can't be used to verify a Turno. */
const hash = (token: string) =>
  createHash('sha256').update(token).digest('base64url');

@Injectable()
export class PrismaBookingsRepository implements BookingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBookingData, expiresAt: Date) {
    const token = randomBytes(32).toString('base64url');
    const row = await this.prisma.booking
      .create({
        data: {
          ...data,
          verificationTokenHash: hash(token),
          verificationTokenExpiresAt: expiresAt,
        },
      })
      .catch(translateError);
    return { booking: toBooking(row), token };
  }

  async hasOverlappingBooked(
    employeeId: number,
    startsAt: Date,
    endsAt: Date,
  ) {
    const overlapping = await this.prisma.booking
      .findFirst({
        where: {
          employeeId,
          status: BookingStatus.BOOKED,
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      })
      .catch(translateError);
    return overlapping !== null;
  }

  async findByVerificationToken(token: string, now: Date) {
    const row = await this.prisma.booking
      .findFirst({ where: { verificationTokenHash: hash(token) } })
      .catch(translateError);
    if (
      !row ||
      !row.verificationTokenExpiresAt ||
      row.verificationTokenExpiresAt <= now
    )
      throw new BusinessRuleError(
        'Unknown, used or expired verification token',
      );
    return toBooking(row);
  }

  async markBooked(id: number) {
    return toBooking(
      await this.prisma.booking
        .update({
          where: { id },
          data: {
            status: BookingStatus.BOOKED,
            verificationTokenHash: null,
            verificationTokenExpiresAt: null,
          },
        })
        .catch(translateError),
    );
  }

  async listByBusiness(businessId: number) {
    return (
      await this.prisma.booking
        .findMany({ where: { employee: { businessId } } })
        .catch(translateError)
    ).map(toBooking);
  }
}

const toBooking = (row: BookingRow): Booking => ({
  id: row.id,
  serviceId: row.serviceId,
  employeeId: row.employeeId,
  clientName: row.clientName,
  clientEmail: row.clientEmail,
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  status: row.status as BookingStatus,
});

/** Postgres 23P01 (exclusion violation) arrives as the generic P2039, per ADR 0004. */
const isOverlapViolation = (error: Prisma.PrismaClientKnownRequestError) => {
  const cause = (
    error.meta as { driverAdapterError?: { cause?: { originalCode?: string } } }
  )?.driverAdapterError?.cause;
  return (
    cause?.originalCode === '23P01' || error.message.includes('Booking_no_overlap')
  );
};

const translateError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025')
      throw new NotFoundError('Booking not found', { cause: error });
    if (error.code === 'P2039' && isOverlapViolation(error))
      throw new ConflictError('Overlaps a booked Turno for this Employee', {
        cause: error,
      });
  }
  throw new DatabaseOperationError('Database operation failed', {
    cause: error,
  });
};
