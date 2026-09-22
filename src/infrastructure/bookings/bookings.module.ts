import { Module } from '@nestjs/common';
import { CreateBookingUseCase } from '../../application/bookings/create-booking.use-case';
import { ListBookingsByBusinessUseCase } from '../../application/bookings/list-bookings-by-business.use-case';
import { VerifyBookingUseCase } from '../../application/bookings/verify-booking.use-case';
import { UsersModule } from '../users/users.module';
import { BookingsController } from './bookings.controller';

@Module({
  imports: [UsersModule],
  controllers: [BookingsController],
  providers: [
    CreateBookingUseCase,
    VerifyBookingUseCase,
    ListBookingsByBusinessUseCase,
  ],
})
export class BookingsModule {}
