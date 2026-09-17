import { Module } from '@nestjs/common';
import { AddEmployeeUseCase } from '../../application/employees/add-employee.use-case';
import { ListEmployeesByBusinessUseCase } from '../../application/employees/list-employees-by-business.use-case';
import { ResendEmployeeVerificationUseCase } from '../../application/employees/resend-employee-verification.use-case';
import { RetireEmployeeUseCase } from '../../application/employees/retire-employee.use-case';
import { UpdateEmployeeUseCase } from '../../application/employees/update-employee.use-case';
import { VerifyEmployeeUseCase } from '../../application/employees/verify-employee.use-case';
import { SessionsModule } from '../sessions/sessions.module';
import { EmployeesController } from './employees.controller';

@Module({
  imports: [SessionsModule],
  controllers: [EmployeesController],
  providers: [
    AddEmployeeUseCase,
    VerifyEmployeeUseCase,
    ResendEmployeeVerificationUseCase,
    UpdateEmployeeUseCase,
    ListEmployeesByBusinessUseCase,
    RetireEmployeeUseCase,
  ],
})
export class EmployeesModule {}
