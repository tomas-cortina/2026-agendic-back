import { Inject, Injectable } from '@nestjs/common';
import { Booking } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { assertOwner } from '../businesses/assert-owner';

@Injectable()
export class ListBookingsByBusinessUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
  ) {}

  async execute(userId: number, businessId: number): Promise<Booking[]> {
    assertOwner(await this.businesses.findById(businessId), userId);
    return this.bookings.listByBusiness(businessId);
  }
}
