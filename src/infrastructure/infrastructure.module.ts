import { Global, Module } from '@nestjs/common';
import { CLOCK } from '../domain/clock';
import { MAILER } from '../domain/mailer';
import { BRANCHES_REPOSITORY } from '../domain/branches/branches.repository';
import { BUSINESSES_REPOSITORY } from '../domain/businesses/businesses.repository';
import { EMPLOYEES_REPOSITORY } from '../domain/employees/employees.repository';
import { SERVICES_REPOSITORY } from '../domain/services/services.repository';
import { SESSIONS_REPOSITORY } from '../domain/sessions/sessions.repository';
import { PASSWORD_HASHER } from '../domain/users/password-hasher';
import { USERS_REPOSITORY } from '../domain/users/users.repository';
import { PrismaBranchesRepository } from './branches/prisma-branches.repository';
import { BranchesModule } from './branches/branches.module';
import { PrismaBusinessesRepository } from './businesses/prisma-businesses.repository';
import { BusinessesModule } from './businesses/businesses.module';
import { PrismaEmployeesRepository } from './employees/prisma-employees.repository';
import { EmployeesModule } from './employees/employees.module';
import { NodemailerMailer } from './nodemailer-mailer';
import { PrismaService } from './prisma.service';
import { PrismaServicesRepository } from './services/prisma-services.repository';
import { ServicesModule } from './services/services.module';
import { PrismaSessionsRepository } from './sessions/prisma-sessions.repository';
import { SessionsModule } from './sessions/sessions.module';
import { SystemClock } from './system-clock';
import { PrismaUsersRepository } from './users/prisma-users.repository';
import { ScryptPasswordHasher } from './users/scrypt-password-hasher';
import { UsersModule } from './users/users.module';

/** Binds every port to its adapter, globally, and wires the REST feature modules. */
@Global()
@Module({
  imports: [
    SessionsModule,
    UsersModule,
    BusinessesModule,
    BranchesModule,
    ServicesModule,
    EmployeesModule,
  ],
  providers: [
    PrismaService,
    { provide: CLOCK, useClass: SystemClock },
    { provide: MAILER, useClass: NodemailerMailer },
    { provide: PASSWORD_HASHER, useClass: ScryptPasswordHasher },
    { provide: USERS_REPOSITORY, useClass: PrismaUsersRepository },
    { provide: SESSIONS_REPOSITORY, useClass: PrismaSessionsRepository },
    { provide: BUSINESSES_REPOSITORY, useClass: PrismaBusinessesRepository },
    { provide: BRANCHES_REPOSITORY, useClass: PrismaBranchesRepository },
    { provide: SERVICES_REPOSITORY, useClass: PrismaServicesRepository },
    { provide: EMPLOYEES_REPOSITORY, useClass: PrismaEmployeesRepository },
  ],
  exports: [
    CLOCK,
    MAILER,
    PASSWORD_HASHER,
    USERS_REPOSITORY,
    SESSIONS_REPOSITORY,
    BUSINESSES_REPOSITORY,
    BRANCHES_REPOSITORY,
    SERVICES_REPOSITORY,
    EMPLOYEES_REPOSITORY,
  ],
})
export class InfrastructureModule {}
