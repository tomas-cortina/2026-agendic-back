import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';
import { Branch } from './domain/branches/branch';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from './domain/branches/branches.repository';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from './domain/bookings/bookings.repository';
import { Business } from './domain/businesses/business';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from './domain/businesses/businesses.repository';
import { CLOCK, Clock } from './domain/clock';
import { UnauthenticatedError } from './domain/errors';
import { Employee } from './domain/employees/employee';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from './domain/employees/employees.repository';
import { Mailer, MAILER } from './domain/mailer';
import { Service, ServiceCategory } from './domain/services/service';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from './domain/services/services.repository';
import { CLERK_AUTH, ClerkAuth, ClerkIdentity } from './domain/users/clerk-auth';
import { User } from './domain/users/user';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from './domain/users/users.repository';

export const DAY_MS = 24 * 60 * 60 * 1000;

export class TestClock implements Clock {
  private current = new Date('2026-01-01T12:00:00.000Z');

  now() {
    return new Date(this.current);
  }

  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms);
  }
}

/**
 * The full app as main.ts configures it, with a controllable Clock and every other outward port a Jest mock
 * for the test to script and inspect, so no database is needed.
 */
export async function createTestApp() {
  const clock = new TestClock();
  const users: jest.Mocked<UsersRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByClerkId: jest.fn(),
    findByEmail: jest.fn(),
    update: jest.fn(),
  };
  const mailer: jest.Mocked<Mailer> = {
    sendVerificationLink: jest.fn(),
  };
  const clerkAuth: jest.Mocked<ClerkAuth> = {
    verifyToken: jest.fn<Promise<ClerkIdentity>, [string | undefined]>(
      async () => {
        throw new UnauthenticatedError('Missing or invalid Clerk token');
      },
    ),
    getProfile: jest.fn(),
    createOrganization: jest.fn(),
    inviteToOrganization: jest.fn(),
  };
  const businesses: jest.Mocked<BusinessesRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByClerkOrgId: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
  };
  const branches: jest.Mocked<BranchesRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    listByBusiness: jest.fn(),
    update: jest.fn(),
  };
  const employees: jest.Mocked<EmployeesRepository> = {
    listByIds: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByClerkId: jest.fn(),
    listActiveByBusiness: jest.fn(),
    update: jest.fn(),
    retire: jest.fn(),
  };
  const services: jest.Mocked<ServicesRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    listActiveByBranch: jest.fn(),
    update: jest.fn(),
    retire: jest.fn(),
    addEmployee: jest.fn(),
    removeEmployee: jest.fn(),
    listActiveByEmployee: jest.fn(),
  };
  const bookings: jest.Mocked<BookingsRepository> = {
    create: jest.fn(),
    hasOverlappingBooked: jest.fn(),
    findByVerificationToken: jest.fn(),
    markBooked: jest.fn(),
    listByBusiness: jest.fn(),
  };
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CLOCK)
    .useValue(clock)
    .overrideProvider(USERS_REPOSITORY)
    .useValue(users)
    .overrideProvider(CLERK_AUTH)
    .useValue(clerkAuth)
    .overrideProvider(MAILER)
    .useValue(mailer)
    .overrideProvider(BUSINESSES_REPOSITORY)
    .useValue(businesses)
    .overrideProvider(BRANCHES_REPOSITORY)
    .useValue(branches)
    .overrideProvider(SERVICES_REPOSITORY)
    .useValue(services)
    .overrideProvider(EMPLOYEES_REPOSITORY)
    .useValue(employees)
    .overrideProvider(BOOKINGS_REPOSITORY)
    .useValue(bookings)
    .compile();
  const app = setupApp(moduleRef.createNestApplication());
  await app.init();
  return {
    app,
    clock,
    users,
    clerkAuth,
    mailer,
    businesses,
    branches,
    services,
    employees,
    bookings,
    http: request(app.getHttpServer()),
  };
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;

export const ANA: User = {
  id: 1,
  clerkId: 'user_clerk_ana',
  name: 'Ana Pérez',
  email: 'ana@example.com',
  createdAt: new Date('2025-12-01T00:00:00.000Z'),
};

export const BRUNO: User = {
  id: 2,
  clerkId: 'user_clerk_bruno',
  name: 'Bruno Díaz',
  email: 'bruno@example.com',
  createdAt: new Date('2025-12-01T00:00:00.000Z'),
};

export const ANAS_BUSINESS: Business = {
  id: 1,
  name: "Ana's Salon",
  description: 'Hair and nails',
  ownerId: ANA.id,
  clerkOrgId: 'org_clerk_anas_salon',
};

export const ANAS_BRANCH: Branch = {
  id: 1,
  businessId: ANAS_BUSINESS.id,
  name: 'Downtown',
  address: '123 Main St',
  opensAt: '09:00',
  closesAt: '18:00',
};

/** Ana as the Empleado of her own Negocio. */
export const ANAS_EMPLOYEE: Employee = {
  id: 1,
  businessId: ANAS_BUSINESS.id,
  clerkId: ANA.clerkId,
  name: ANA.name,
  email: ANA.email,
  retiredAt: null,
};

/** A Servicio of Ana's Sucursal, attended by Ana. */
export const ANAS_SERVICE: Service = {
  id: 1,
  branchId: ANAS_BRANCH.id,
  name: 'Haircut',
  description: 'A basic haircut',
  category: ServiceCategory.SPA,
  durationMinutes: 30,
  price: 20,
  retiredAt: null,
  employees: [{ id: ANAS_EMPLOYEE.id, name: ANAS_EMPLOYEE.name }],
};

export const CLERK_TOKEN = 'clerk-jwt-1';
export const OTHER_CLERK_TOKEN = 'clerk-jwt-2';

/** Makes `bearer(CLERK_TOKEN)` resolve to Ana, an already-known local User, active in her own Organization. */
export function scriptSession({ clerkAuth, users }: TestApp) {
  const verifyToken = clerkAuth.verifyToken.getMockImplementation()!;
  clerkAuth.verifyToken.mockImplementation(async (token) =>
    token === CLERK_TOKEN
      ? { clerkId: ANA.clerkId, orgId: ANAS_BUSINESS.clerkOrgId }
      : verifyToken(token),
  );
  const findByClerkId = users.findByClerkId.getMockImplementation();
  users.findByClerkId.mockImplementation(async (clerkId) =>
    clerkId === ANA.clerkId ? ANA : (findByClerkId?.(clerkId) ?? null),
  );
}

/** Makes `bearer(OTHER_CLERK_TOKEN)` resolve to Bruno, alongside Ana's from scriptSession. */
export function scriptOtherSession({ clerkAuth, users }: TestApp) {
  const verifyToken = clerkAuth.verifyToken.getMockImplementation()!;
  clerkAuth.verifyToken.mockImplementation(async (token) =>
    token === OTHER_CLERK_TOKEN
      ? { clerkId: BRUNO.clerkId, orgId: null }
      : verifyToken(token),
  );
  const findByClerkId = users.findByClerkId.getMockImplementation();
  users.findByClerkId.mockImplementation(async (clerkId) =>
    clerkId === BRUNO.clerkId ? BRUNO : (findByClerkId?.(clerkId) ?? null),
  );
}

/** Makes `bearer(CLERK_TOKEN)` resolve to Ana as the Empleado of her own Negocio (see scriptSession for the User side). */
export function scriptEmployeeSession({ clerkAuth, employees }: TestApp) {
  const verifyToken = clerkAuth.verifyToken.getMockImplementation()!;
  clerkAuth.verifyToken.mockImplementation(async (token) =>
    token === CLERK_TOKEN
      ? { clerkId: ANA.clerkId, orgId: ANAS_BUSINESS.clerkOrgId }
      : verifyToken(token),
  );
  const findByClerkId = employees.findByClerkId.getMockImplementation();
  employees.findByClerkId.mockImplementation(async (clerkId) =>
    clerkId === ANA.clerkId ? ANAS_EMPLOYEE : (findByClerkId?.(clerkId) ?? null),
  );
}

export const bearer = (token: string) => ({
  Authorization: `Bearer ${token}`,
});
