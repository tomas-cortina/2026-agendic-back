import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GetMeUseCase } from '../../application/users/get-me.use-case';
import { ResendVerificationUseCase } from '../../application/users/resend-verification.use-case';
import { SignUpUseCase } from '../../application/users/sign-up.use-case';
import { UpdateMeUseCase } from '../../application/users/update-me.use-case';
import { VerifyEmailUseCase } from '../../application/users/verify-email.use-case';
import { Session } from '../../domain/sessions/session';
import { CurrentSession, SessionGuard } from '../sessions/session.guard';
import { presentSession } from '../sessions/session.presenter';
import { presentUser } from './user.presenter';
import {
  ResendVerificationDto,
  SignUpDto,
  UpdateMeDto,
  VerifyEmailDto,
} from './users.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly signUpUseCase: SignUpUseCase,
    private readonly getMeUseCase: GetMeUseCase,
    private readonly updateMeUseCase: UpdateMeUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly resendVerificationUseCase: ResendVerificationUseCase,
  ) {}

  @Post()
  async signUp(@Body() dto: SignUpDto) {
    return presentUser(await this.signUpUseCase.execute(dto));
  }

  @Post('verification')
  async verify(@Body() dto: VerifyEmailDto) {
    return presentSession(
      await this.verifyEmailUseCase.execute(dto.email, dto.code),
    );
  }

  @Post('verification/resend')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resend(@Body() dto: ResendVerificationDto) {
    await this.resendVerificationUseCase.execute(dto.email);
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
