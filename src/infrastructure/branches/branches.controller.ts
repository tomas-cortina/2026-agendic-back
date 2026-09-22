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
import { CreateBranchUseCase } from '../../application/branches/create-branch.use-case';
import { ListBranchesByBusinessUseCase } from '../../application/branches/list-branches-by-business.use-case';
import { UpdateBranchUseCase } from '../../application/branches/update-branch.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { presentBranch } from './branch.presenter';
import { CreateBranchDto, UpdateBranchDto } from './branches.dto';

@Controller()
export class BranchesController {
  constructor(
    private readonly createBranchUseCase: CreateBranchUseCase,
    private readonly updateBranchUseCase: UpdateBranchUseCase,
    private readonly listBranchesByBusinessUseCase: ListBranchesByBusinessUseCase,
  ) {}

  @Post('businesses/:businessId/branches')
  @UseGuards(ClerkGuard)
  async create(
    @CurrentUser() userId: number,
    @Param('businessId', ParseIntPipe) businessId: number,
    @Body() dto: CreateBranchDto,
  ) {
    return presentBranch(
      await this.createBranchUseCase.execute(userId, businessId, dto),
    );
  }

  @Patch('branches/:id')
  @UseGuards(ClerkGuard)
  async update(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBranchDto,
  ) {
    return presentBranch(
      await this.updateBranchUseCase.execute(userId, id, dto),
    );
  }

  @Get('businesses/:businessId/branches')
  async list(@Param('businessId', ParseIntPipe) businessId: number) {
    return (
      await this.listBranchesByBusinessUseCase.execute(businessId)
    ).map(presentBranch);
  }
}
