import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SignInUseCase } from '../../application/sessions/sign-in.use-case';
import { SignOutUseCase } from '../../application/sessions/sign-out.use-case';
import { Session } from '../../domain/sessions/session';
import { CurrentSession, SessionGuard } from './session.guard';
import { presentSession } from './session.presenter';
import { SignInDto } from './sessions.dto';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly signInUseCase: SignInUseCase,
    private readonly signOutUseCase: SignOutUseCase,
  ) {}

  @Post()
  async signIn(@Body() dto: SignInDto) {
    return presentSession(await this.signInUseCase.execute(dto));
  }

  @Delete('current')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionGuard)
  async signOut(@CurrentSession() session: Session) {
    await this.signOutUseCase.execute(session.id);
  }
}
