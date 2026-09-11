import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServicesModule } from './services/services.module'; // <-- IMPORTANTE
import { ProfessionalsModule } from './professionals/professionals.module'; // <-- IMPORTANTE

@Module({
  imports: [ServicesModule, ProfessionalsModule], // <-- REGISTRAR AQUÍ
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}