import { Global, Module } from '@nestjs/common';
import { CLOCK } from '../domain/clock';
import { MAILER } from '../domain/mailer';
import { BOOKINGS_REPOSITORY } from '../domain/bookings/bookings.repository';
import { BRANCHES_REPOSITORY } from '../domain/branches/branches.repository';
import { BUSINESSES_REPOSITORY } from '../domain/businesses/businesses.repository';
import { EMPLOYEES_REPOSITORY } from '../domain/employees/employees.repository';
import { SERVICES_REPOSITORY } from '../domain/services/services.repository';
import { CLERK_AUTH } from '../domain/users/clerk-auth';
import { USERS_REPOSITORY } from '../domain/users/users.repository';
import { PrismaBookingsRepository } from './bookings/prisma-bookings.repository';
import { BookingsModule } from './bookings/bookings.module';
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
import { SystemClock } from './system-clock';
import { ClerkBackendAuth } from './users/clerk-backend-auth';
import { PrismaUsersRepository } from './users/prisma-users.repository';
import { UsersModule } from './users/users.module';

/** Binds every port to its adapter, globally, and wires the REST feature modules. */
@Global()
@Module({
  imports: [
    UsersModule,
    BusinessesModule,
    BranchesModule,
    ServicesModule,
    EmployeesModule,
    BookingsModule,
  ],
  providers: [
    PrismaService,
    { provide: CLOCK, useClass: SystemClock },
    { provide: MAILER, useClass: NodemailerMailer },
    { provide: CLERK_AUTH, useClass: ClerkBackendAuth },
    { provide: USERS_REPOSITORY, useClass: PrismaUsersRepository },
    { provide: BUSINESSES_REPOSITORY, useClass: PrismaBusinessesRepository },
    { provide: BRANCHES_REPOSITORY, useClass: PrismaBranchesRepository },
    { provide: SERVICES_REPOSITORY, useClass: PrismaServicesRepository },
    { provide: EMPLOYEES_REPOSITORY, useClass: PrismaEmployeesRepository },
    { provide: BOOKINGS_REPOSITORY, useClass: PrismaBookingsRepository },
  ],
  exports: [
    CLOCK,
    MAILER,
    CLERK_AUTH,
    USERS_REPOSITORY,
    BUSINESSES_REPOSITORY,
    BRANCHES_REPOSITORY,
    SERVICES_REPOSITORY,
    EMPLOYEES_REPOSITORY,
    BOOKINGS_REPOSITORY,
  ],
})
export class InfrastructureModule {}
