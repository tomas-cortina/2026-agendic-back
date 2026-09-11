import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServicesModule } from './services/services.module'; // <-- IMPORTANTE
import { ProfessionalsModule } from './professionals/professionals.module'; // <-- IMPORTANTE
import { ReservationsModule } from './reservations/reservations.module'; // <-- IMPORTANTE
import { UsersModule } from './users/users.module'; // <-- IMPORTANTE

@Module({
  imports: [ServicesModule, ProfessionalsModule, ReservationsModule, UsersModule], // <-- REGISTRAR AQUÍ
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}