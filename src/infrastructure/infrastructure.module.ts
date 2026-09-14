import { Global, Module } from '@nestjs/common';
import { CLOCK } from '../domain/clock';
import { SESSIONS_REPOSITORY } from '../domain/sessions/sessions.repository';
import { PASSWORD_HASHER } from '../domain/users/password-hasher';
import { USERS_REPOSITORY } from '../domain/users/users.repository';
import { PrismaService } from './prisma.service';
import { PrismaSessionsRepository } from './sessions/prisma-sessions.repository';
import { SessionsModule } from './sessions/sessions.module';
import { SystemClock } from './system-clock';
import { PrismaUsersRepository } from './users/prisma-users.repository';
import { ScryptPasswordHasher } from './users/scrypt-password-hasher';
import { UsersModule } from './users/users.module';

/** Binds every port to its adapter, globally, and wires the REST feature modules. */
@Global()
@Module({
  imports: [SessionsModule, UsersModule],
  providers: [
    PrismaService,
    { provide: CLOCK, useClass: SystemClock },
    { provide: PASSWORD_HASHER, useClass: ScryptPasswordHasher },
    { provide: USERS_REPOSITORY, useClass: PrismaUsersRepository },
    { provide: SESSIONS_REPOSITORY, useClass: PrismaSessionsRepository },
  ],
  exports: [CLOCK, PASSWORD_HASHER, USERS_REPOSITORY, SESSIONS_REPOSITORY],
})
export class InfrastructureModule {}
