import { Module } from '@nestjs/common';
import { GetMeUseCase } from '../../application/users/get-me.use-case';
import { SignUpUseCase } from '../../application/users/sign-up.use-case';
import { UpdateMeUseCase } from '../../application/users/update-me.use-case';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersController } from './users.controller';

@Module({
  imports: [SessionsModule],
  controllers: [UsersController],
  providers: [SignUpUseCase, GetMeUseCase, UpdateMeUseCase],
})
export class UsersModule {}
