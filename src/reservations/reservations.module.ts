import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { ServicesModule } from '../services/services.module';
import { ProfessionalsModule } from '../professionals/professionals.module';

@Module({
  imports: [ServicesModule, ProfessionalsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}