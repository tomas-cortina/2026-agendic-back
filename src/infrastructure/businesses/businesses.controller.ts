import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateBusinessUseCase } from '../../application/businesses/create-business.use-case';
import { GetBusinessUseCase } from '../../application/businesses/get-business.use-case';
import { ListBusinessesUseCase } from '../../application/businesses/list-businesses.use-case';
import { UpdateBusinessUseCase } from '../../application/businesses/update-business.use-case';
import { presentBranch } from '../branches/branch.presenter';
import { presentEmployee } from '../employees/employee.presenter';
import { presentService } from '../services/service.presenter';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { presentBusiness } from './business.presenter';
import { CreateBusinessDto, UpdateBusinessDto } from './businesses.dto';

@Controller('businesses')
export class BusinessesController {
  constructor(
    private readonly createBusinessUseCase: CreateBusinessUseCase,
    private readonly updateBusinessUseCase: UpdateBusinessUseCase,
    private readonly listBusinessesUseCase: ListBusinessesUseCase,
    private readonly getBusinessUseCase: GetBusinessUseCase,
  ) {}

  @Post()
  @UseGuards(ClerkGuard)
  async create(
    @CurrentUser() userId: number,
    @Body() dto: CreateBusinessDto,
  ) {
    const created = await this.createBusinessUseCase.execute(userId, dto);
    return {
      business: presentBusiness(created.business),
      branch: presentBranch(created.branch),
      service: presentService(created.service),
      employee: presentEmployee(created.employee),
    };
  }

  @Patch(':id')
  @UseGuards(ClerkGuard)
  async update(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBusinessDto,
  ) {
    return presentBusiness(
      await this.updateBusinessUseCase.execute(userId, id, dto),
    );
  }

  @Get()
  async list() {
    return (await this.listBusinessesUseCase.execute()).map(presentBusiness);
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return presentBusiness(await this.getBusinessUseCase.execute(id));
  }
}
