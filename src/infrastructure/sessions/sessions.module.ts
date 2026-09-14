import { Module } from '@nestjs/common';
import { SignInUseCase } from '../../application/sessions/sign-in.use-case';
import { SignOutUseCase } from '../../application/sessions/sign-out.use-case';
import { ValidateSessionUseCase } from '../../application/sessions/validate-session.use-case';
import { SessionsController } from './sessions.controller';

@Module({
  controllers: [SessionsController],
  providers: [SignInUseCase, SignOutUseCase, ValidateSessionUseCase],
  exports: [ValidateSessionUseCase],
})
export class SessionsModule {}
