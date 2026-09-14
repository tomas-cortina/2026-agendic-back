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
import { Session } from '../../domain/sessions/session';
import { CurrentSession, SessionGuard } from '../sessions/session.guard';
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
  @UseGuards(SessionGuard)
  async create(
    @CurrentSession() session: Session,
    @Param('businessId', ParseIntPipe) businessId: number,
    @Body() dto: CreateBranchDto,
  ) {
    return presentBranch(
      await this.createBranchUseCase.execute(session.userId, businessId, dto),
    );
  }

  @Patch('branches/:id')
  @UseGuards(SessionGuard)
  async update(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBranchDto,
  ) {
    return presentBranch(
      await this.updateBranchUseCase.execute(session.userId, id, dto),
    );
  }

  @Get('businesses/:businessId/branches')
  async list(@Param('businessId', ParseIntPipe) businessId: number) {
    return (
      await this.listBranchesByBusinessUseCase.execute(businessId)
    ).map(presentBranch);
  }
}
