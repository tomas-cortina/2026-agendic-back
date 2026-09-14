import { Global, Module } from '@nestjs/common';
import { CLOCK } from '../domain/clock';
import { SESSIONS_REPOSITORY } from '../domain/sessions/sessions.repository';
import { PASSWORD_HASHER } from '../domain/users/password-hasher';
import { USERS_REPOSITORY } from '../domain/users/users.repository';
import { InMemorySessionsRepository } from './sessions/in-memory-sessions.repository';
import { SessionsModule } from './sessions/sessions.module';
import { SystemClock } from './system-clock';
import { InMemoryUsersRepository } from './users/in-memory-users.repository';
import { ScryptPasswordHasher } from './users/scrypt-password-hasher';
import { UsersModule } from './users/users.module';

/** Binds every port to its adapter, globally, and wires the REST feature modules. */
@Global()
@Module({
  imports: [SessionsModule, UsersModule],
  providers: [
    { provide: CLOCK, useClass: SystemClock },
    { provide: PASSWORD_HASHER, useClass: ScryptPasswordHasher },
    { provide: USERS_REPOSITORY, useClass: InMemoryUsersRepository },
    { provide: SESSIONS_REPOSITORY, useClass: InMemorySessionsRepository },
  ],
  exports: [CLOCK, PASSWORD_HASHER, USERS_REPOSITORY, SESSIONS_REPOSITORY],
})
export class InfrastructureModule {}
