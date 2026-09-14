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
import { ListActiveServicesByBusinessUseCase } from '../../application/services/list-active-services-by-business.use-case';
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
    private readonly listActiveServicesByBusinessUseCase: ListActiveServicesByBusinessUseCase,
  ) {}

  @Post('businesses/:businessId/services')
  @UseGuards(SessionGuard)
  async create(
    @CurrentSession() session: Session,
    @Param('businessId', ParseIntPipe) businessId: number,
    @Body() dto: CreateServiceDto,
  ) {
    return presentService(
      await this.createServiceUseCase.execute(
        session.userId,
        businessId,
        dto,
      ),
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

  @Get('businesses/:businessId/services')
  async list(@Param('businessId', ParseIntPipe) businessId: number) {
    return (
      await this.listActiveServicesByBusinessUseCase.execute(businessId)
    ).map(presentService);
  }
}
