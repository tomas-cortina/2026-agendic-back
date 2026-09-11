import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';

@Module({
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService], // Por si Scheduling Service necesita consultar duración/precio[cite: 3]
})
export class ServicesModule {}