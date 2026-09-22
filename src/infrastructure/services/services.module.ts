import { Module } from '@nestjs/common';
import { AssignEmployeeUseCase } from '../../application/services/assign-employee.use-case';
import { CreateServiceUseCase } from '../../application/services/create-service.use-case';
import { ListActiveServicesByBranchUseCase } from '../../application/services/list-active-services-by-branch.use-case';
import { RemoveEmployeeUseCase } from '../../application/services/remove-employee.use-case';
import { RetireServiceUseCase } from '../../application/services/retire-service.use-case';
import { UpdateServiceUseCase } from '../../application/services/update-service.use-case';
import { UsersModule } from '../users/users.module';
import { ServicesController } from './services.controller';

@Module({
  imports: [UsersModule],
  controllers: [ServicesController],
  providers: [
    CreateServiceUseCase,
    UpdateServiceUseCase,
    RetireServiceUseCase,
    ListActiveServicesByBranchUseCase,
    AssignEmployeeUseCase,
    RemoveEmployeeUseCase,
  ],
})
export class ServicesModule {}
