import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { GetMeUseCase } from '../../application/users/get-me.use-case';
import { UpdateMeUseCase } from '../../application/users/update-me.use-case';
import { ClerkGuard, CurrentUser } from './clerk.guard';
import { presentUser } from './user.presenter';
import { UpdateMeDto } from './users.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly getMeUseCase: GetMeUseCase,
    private readonly updateMeUseCase: UpdateMeUseCase,
  ) {}

  @Get('me')
  @UseGuards(ClerkGuard)
  async getMe(@CurrentUser() userId: number) {
    return presentUser(await this.getMeUseCase.execute(userId));
  }

  @Patch('me')
  @UseGuards(ClerkGuard)
  async updateMe(@CurrentUser() userId: number, @Body() dto: UpdateMeDto) {
    return presentUser(await this.updateMeUseCase.execute(userId, dto));
  }
}
