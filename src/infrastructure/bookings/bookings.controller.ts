import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateBookingUseCase } from '../../application/bookings/create-booking.use-case';
import { ListBookingsByBusinessUseCase } from '../../application/bookings/list-bookings-by-business.use-case';
import { VerifyBookingUseCase } from '../../application/bookings/verify-booking.use-case';
import { Session } from '../../domain/sessions/session';
import { CurrentSession, SessionGuard } from '../sessions/session.guard';
import { presentBooking, presentBookingForOwner } from './booking.presenter';
import { CreateBookingDto, VerifyBookingDto } from './bookings.dto';

@Controller()
export class BookingsController {
  constructor(
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly verifyBookingUseCase: VerifyBookingUseCase,
    private readonly listBookingsByBusinessUseCase: ListBookingsByBusinessUseCase,
  ) {}

  @Post('bookings')
  async create(@Body() dto: CreateBookingDto) {
    return presentBooking(
      await this.createBookingUseCase.execute({
        serviceId: dto.serviceId,
        employeeId: dto.employeeId,
        startsAt: new Date(dto.startsAt),
        clientName: dto.clientName,
        clientEmail: dto.clientEmail,
      }),
    );
  }

  @Post('bookings/verification')
  async verify(@Body() dto: VerifyBookingDto) {
    return presentBooking(await this.verifyBookingUseCase.execute(dto.token));
  }

  @Get('businesses/:id/bookings')
  @UseGuards(SessionGuard)
  async listByBusiness(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) businessId: number,
  ) {
    return (
      await this.listBookingsByBusinessUseCase.execute(
        session.userId,
        businessId,
      )
    ).map(presentBookingForOwner);
  }
}
