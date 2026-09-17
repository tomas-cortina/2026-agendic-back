import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AddEmployeeUseCase } from '../../application/employees/add-employee.use-case';
import { ListEmployeesByBusinessUseCase } from '../../application/employees/list-employees-by-business.use-case';
import { ResendEmployeeVerificationUseCase } from '../../application/employees/resend-employee-verification.use-case';
import { UpdateEmployeeUseCase } from '../../application/employees/update-employee.use-case';
import { VerifyEmployeeUseCase } from '../../application/employees/verify-employee.use-case';
import { Session } from '../../domain/sessions/session';
import { CurrentSession, SessionGuard } from '../sessions/session.guard';
import { presentEmployee } from './employee.presenter';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  VerifyEmployeeDto,
} from './employees.dto';

@Controller()
export class EmployeesController {
  constructor(
    private readonly addEmployeeUseCase: AddEmployeeUseCase,
    private readonly verifyEmployeeUseCase: VerifyEmployeeUseCase,
    private readonly resendEmployeeVerificationUseCase: ResendEmployeeVerificationUseCase,
    private readonly updateEmployeeUseCase: UpdateEmployeeUseCase,
    private readonly listEmployeesByBusinessUseCase: ListEmployeesByBusinessUseCase,
  ) {}

  @Post('businesses/:id/employees')
  @UseGuards(SessionGuard)
  async create(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) businessId: number,
    @Body() dto: CreateEmployeeDto,
  ) {
    return presentEmployee(
      await this.addEmployeeUseCase.execute(session.userId, businessId, dto),
    );
  }

  @Post('employees/verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  async verify(@Body() dto: VerifyEmployeeDto) {
    await this.verifyEmployeeUseCase.execute(dto.token);
  }

  @Post('employees/:id/verification/resend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionGuard)
  async resend(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.resendEmployeeVerificationUseCase.execute(session.userId, id);
  }

  @Patch('employees/:id')
  @UseGuards(SessionGuard)
  async update(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return presentEmployee(
      await this.updateEmployeeUseCase.execute(session.userId, id, dto.name),
    );
  }

  @Get('businesses/:id/employees')
  @UseGuards(SessionGuard)
  async list(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) businessId: number,
  ) {
    return (
      await this.listEmployeesByBusinessUseCase.execute(
        session.userId,
        businessId,
      )
    ).map(presentEmployee);
  }
}
