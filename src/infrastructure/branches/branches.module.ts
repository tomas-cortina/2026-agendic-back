import { Module } from '@nestjs/common';
import { CreateBranchUseCase } from '../../application/branches/create-branch.use-case';
import { ListBranchesByBusinessUseCase } from '../../application/branches/list-branches-by-business.use-case';
import { UpdateBranchUseCase } from '../../application/branches/update-branch.use-case';
import { SessionsModule } from '../sessions/sessions.module';
import { BranchesController } from './branches.controller';

@Module({
  imports: [SessionsModule],
  controllers: [BranchesController],
  providers: [
    CreateBranchUseCase,
    UpdateBranchUseCase,
    ListBranchesByBusinessUseCase,
  ],
})
export class BranchesModule {}
