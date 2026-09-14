import { Module } from '@nestjs/common';
import { CreateServiceUseCase } from '../../application/services/create-service.use-case';
import { ListActiveServicesByBusinessUseCase } from '../../application/services/list-active-services-by-business.use-case';
import { RetireServiceUseCase } from '../../application/services/retire-service.use-case';
import { UpdateServiceUseCase } from '../../application/services/update-service.use-case';
import { SessionsModule } from '../sessions/sessions.module';
import { ServicesController } from './services.controller';

@Module({
  imports: [SessionsModule],
  controllers: [ServicesController],
  providers: [
    CreateServiceUseCase,
    UpdateServiceUseCase,
    RetireServiceUseCase,
    ListActiveServicesByBusinessUseCase,
  ],
})
export class ServicesModule {}
