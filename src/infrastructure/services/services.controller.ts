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
import { CreateServiceUseCase } from '../../application/services/create-service.use-case';
import { ListActiveServicesByBranchUseCase } from '../../application/services/list-active-services-by-branch.use-case';
import { RetireServiceUseCase } from '../../application/services/retire-service.use-case';
import { UpdateServiceUseCase } from '../../application/services/update-service.use-case';
import { Session } from '../../domain/sessions/session';
import { CurrentSession, SessionGuard } from '../sessions/session.guard';
import { presentService } from './service.presenter';
import { CreateServiceDto, UpdateServiceDto } from './services.dto';

@Controller()
export class ServicesController {
  constructor(
    private readonly createServiceUseCase: CreateServiceUseCase,
    private readonly updateServiceUseCase: UpdateServiceUseCase,
    private readonly retireServiceUseCase: RetireServiceUseCase,
    private readonly listActiveServicesByBranchUseCase: ListActiveServicesByBranchUseCase,
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

  @Get('branches/:id/services')
  async list(@Param('id', ParseIntPipe) branchId: number) {
    return (
      await this.listActiveServicesByBranchUseCase.execute(branchId)
    ).map(presentService);
  }
}
