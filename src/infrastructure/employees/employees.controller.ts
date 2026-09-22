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
import { GetMeEmployeeUseCase } from '../../application/employees/get-me-employee.use-case';
import { ListEmployeesByBusinessUseCase } from '../../application/employees/list-employees-by-business.use-case';
import { RetireEmployeeUseCase } from '../../application/employees/retire-employee.use-case';
import { UpdateEmployeeUseCase } from '../../application/employees/update-employee.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { CurrentEmployee, EmployeeClerkGuard } from './employee-clerk.guard';
import { presentEmployee } from './employee.presenter';
import { CreateEmployeeDto, UpdateEmployeeDto } from './employees.dto';

@Controller()
export class EmployeesController {
  constructor(
    private readonly addEmployeeUseCase: AddEmployeeUseCase,
    private readonly getMeEmployeeUseCase: GetMeEmployeeUseCase,
    private readonly updateEmployeeUseCase: UpdateEmployeeUseCase,
    private readonly listEmployeesByBusinessUseCase: ListEmployeesByBusinessUseCase,
    private readonly retireEmployeeUseCase: RetireEmployeeUseCase,
  ) {}

  @Post('businesses/:id/employees')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(ClerkGuard)
  async create(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) businessId: number,
    @Body() dto: CreateEmployeeDto,
  ) {
    await this.addEmployeeUseCase.execute(userId, businessId, dto);
  }

  @Get('employees/me')
  @UseGuards(EmployeeClerkGuard)
  async getMe(@CurrentEmployee() employeeId: number) {
    return presentEmployee(await this.getMeEmployeeUseCase.execute(employeeId));
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
