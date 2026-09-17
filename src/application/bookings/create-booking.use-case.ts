import { Inject, Injectable } from '@nestjs/common';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import { Booking, bookingVerificationExpiresAt, CreateBookingInput } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { ConflictError } from '../../domain/errors';
import { MAILER, Mailer } from '../../domain/mailer';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { assertBookable, assertWithinHours } from './assert-booking-rules';

@Injectable()
export class CreateBookingUseCase {
  constructor(
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    @Inject(BRANCHES_REPOSITORY) private readonly branches: BranchesRepository,
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(input: CreateBookingInput): Promise<Booking> {
    const now = this.clock.now();
    const { service, branch } = await assertBookable(
      this.services,
      this.branches,
      input.serviceId,
      input.employeeId,
      input.startsAt,
      now,
    );
    const endsAt = new Date(
      input.startsAt.getTime() + service.durationMinutes * 60_000,
    );
    assertWithinHours(branch, input.startsAt, endsAt);
    if (
      await this.bookings.hasOverlappingBooked(
        input.employeeId,
        input.startsAt,
        endsAt,
      )
    )
      throw new ConflictError('Overlaps a booked Turno for this Employee');

    const { booking, token } = await this.bookings.create(
      {
        serviceId: input.serviceId,
        employeeId: input.employeeId,
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        startsAt: input.startsAt,
        endsAt,
      },
      bookingVerificationExpiresAt(now),
    );
    await this.mailer.sendVerificationLink(booking.clientEmail, token);
    return booking;
  }
}
