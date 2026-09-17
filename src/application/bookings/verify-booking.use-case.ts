import { Inject, Injectable } from '@nestjs/common';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import { Booking } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { assertBookable, assertWithinHours } from './assert-booking-rules';

/** Re-checks every booking rule at verification time, since it has been up to 24h since the request. */
@Injectable()
export class VerifyBookingUseCase {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    @Inject(BRANCHES_REPOSITORY) private readonly branches: BranchesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(token: string): Promise<Booking> {
    const now = this.clock.now();
    const booking = await this.bookings.findByVerificationToken(token, now);
    const { branch } = await assertBookable(
      this.services,
      this.branches,
      booking.serviceId,
      booking.employeeId,
      booking.startsAt,
      now,
    );
    assertWithinHours(branch, booking.startsAt, booking.endsAt);
    return this.bookings.markBooked(booking.id);
  }
}
