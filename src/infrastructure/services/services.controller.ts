import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AssignEmployeeUseCase } from '../../application/services/assign-employee.use-case';
import { CreateServiceUseCase } from '../../application/services/create-service.use-case';
import { ListActiveServicesByBranchUseCase } from '../../application/services/list-active-services-by-branch.use-case';
import { RemoveEmployeeUseCase } from '../../application/services/remove-employee.use-case';
import { RetireServiceUseCase } from '../../application/services/retire-service.use-case';
import { UpdateServiceUseCase } from '../../application/services/update-service.use-case';
import { Session } from '../../domain/sessions/session';
import { CurrentSession, SessionGuard } from '../sessions/session.guard';
import { presentService } from './service.presenter';
import {
  AssignEmployeeDto,
  CreateServiceDto,
  UpdateServiceDto,
} from './services.dto';

@Controller()
export class ServicesController {
  constructor(
    private readonly createServiceUseCase: CreateServiceUseCase,
    private readonly updateServiceUseCase: UpdateServiceUseCase,
    private readonly retireServiceUseCase: RetireServiceUseCase,
    private readonly listActiveServicesByBranchUseCase: ListActiveServicesByBranchUseCase,
    private readonly assignEmployeeUseCase: AssignEmployeeUseCase,
    private readonly removeEmployeeUseCase: RemoveEmployeeUseCase,
  ) {}

  @Post('branches/:id/services')
  @UseGuards(SessionGuard)
  async create(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) branchId: number,
    @Body() dto: CreateServiceDto,
  ) {
    return presentService(
      await this.createServiceUseCase.execute(session.userId, branchId, dto),
    );
  }

  @Patch('services/:id')
  @UseGuards(SessionGuard)
  async update(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceDto,
  ) {
    return presentService(
      await this.updateServiceUseCase.execute(session.userId, id, dto),
    );
  }

  @Delete('services/:id')
  @UseGuards(SessionGuard)
  async retire(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.retireServiceUseCase.execute(session.userId, id);
  }

  @Post('services/:id/employees')
  @UseGuards(SessionGuard)
  async assignEmployee(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) serviceId: number,
    @Body() dto: AssignEmployeeDto,
  ) {
    return presentService(
      await this.assignEmployeeUseCase.execute(
        session.userId,
        serviceId,
        dto.employeeId,
      ),
    );
  }

  @Delete('services/:id/employees/:employeeId')
  @UseGuards(SessionGuard)
  async removeEmployee(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) serviceId: number,
    @Param('employeeId', ParseIntPipe) employeeId: number,
  ) {
    return this.removeEmployeeUseCase.execute(
      session.userId,
      serviceId,
      employeeId,
    );
  }

  @Get('branches/:id/services')
  async list(@Param('id', ParseIntPipe) branchId: number) {
    return (
      await this.listActiveServicesByBranchUseCase.execute(branchId)
    ).map(presentService);
  }
}
