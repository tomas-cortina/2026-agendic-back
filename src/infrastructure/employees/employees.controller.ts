import {
  Body,
  Controller,
  Delete,
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
import { RetireEmployeeUseCase } from '../../application/employees/retire-employee.use-case';
import { UpdateEmployeeUseCase } from '../../application/employees/update-employee.use-case';
import { VerifyEmployeeUseCase } from '../../application/employees/verify-employee.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
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
    private readonly retireEmployeeUseCase: RetireEmployeeUseCase,
  ) {}

  @Post('businesses/:id/employees')
  @UseGuards(ClerkGuard)
  async create(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) businessId: number,
    @Body() dto: CreateEmployeeDto,
  ) {
    return presentEmployee(
      await this.addEmployeeUseCase.execute(userId, businessId, dto),
    );
  }

  @Post('employees/verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  async verify(@Body() dto: VerifyEmployeeDto) {
    await this.verifyEmployeeUseCase.execute(dto.email, dto.code);
  }

  @Post('employees/:id/verification/resend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ClerkGuard)
  async resend(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.resendEmployeeVerificationUseCase.execute(userId, id);
  }

  @Patch('employees/:id')
  @UseGuards(ClerkGuard)
  async update(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return presentEmployee(
      await this.updateEmployeeUseCase.execute(userId, id, dto.name),
    );
  }

  @Delete('employees/:id')
  @UseGuards(ClerkGuard)
  async retire(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.retireEmployeeUseCase.execute(userId, id);
  }

  @Get('businesses/:id/employees')
  @UseGuards(ClerkGuard)
  async list(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) businessId: number,
  ) {
    return (
      await this.listEmployeesByBusinessUseCase.execute(userId, businessId)
    ).map(presentEmployee);
  }
}
