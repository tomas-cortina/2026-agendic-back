import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { GetMeUseCase } from '../../application/users/get-me.use-case';
import { SignUpUseCase } from '../../application/users/sign-up.use-case';
import { UpdateMeUseCase } from '../../application/users/update-me.use-case';
import { Session } from '../../domain/sessions/session';
import { CurrentSession, SessionGuard } from '../sessions/session.guard';
import { presentSession } from '../sessions/session.presenter';
import { presentUser } from './user.presenter';
import { SignUpDto, UpdateMeDto } from './users.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly signUpUseCase: SignUpUseCase,
    private readonly getMeUseCase: GetMeUseCase,
    private readonly updateMeUseCase: UpdateMeUseCase,
  ) {}

  @Post()
  async signUp(@Body() dto: SignUpDto) {
    return presentSession(await this.signUpUseCase.execute(dto));
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async getMe(@CurrentSession() session: Session) {
    return presentUser(await this.getMeUseCase.execute(session.userId));
  }

  @Patch('me')
  @UseGuards(SessionGuard)
  async updateMe(@CurrentSession() session: Session, @Body() dto: UpdateMeDto) {
    return presentUser(await this.updateMeUseCase.execute(session.userId, dto));
  }
}
