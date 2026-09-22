import { Module } from '@nestjs/common';
import { AddEmployeeUseCase } from '../../application/employees/add-employee.use-case';
import { GetMeEmployeeUseCase } from '../../application/employees/get-me-employee.use-case';
import { ListEmployeesByBusinessUseCase } from '../../application/employees/list-employees-by-business.use-case';
import { ResolveCurrentEmployeeUseCase } from '../../application/employees/resolve-current-employee.use-case';
import { RetireEmployeeUseCase } from '../../application/employees/retire-employee.use-case';
import { UpdateEmployeeUseCase } from '../../application/employees/update-employee.use-case';
import { UsersModule } from '../users/users.module';
import { EmployeesController } from './employees.controller';

@Module({
  imports: [UsersModule],
  controllers: [EmployeesController],
  providers: [
    AddEmployeeUseCase,
    GetMeEmployeeUseCase,
    ResolveCurrentEmployeeUseCase,
    UpdateEmployeeUseCase,
    ListEmployeesByBusinessUseCase,
    RetireEmployeeUseCase,
  ],
})
export class EmployeesModule {}
