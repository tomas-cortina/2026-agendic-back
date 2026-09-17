import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';
import { Branch } from './domain/branches/branch';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from './domain/branches/branches.repository';
import { Business } from './domain/businesses/business';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from './domain/businesses/businesses.repository';
import { CLOCK, Clock } from './domain/clock';
import { Employee } from './domain/employees/employee';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from './domain/employees/employees.repository';
import { Mailer, MAILER } from './domain/mailer';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from './domain/services/services.repository';
import {
  SESSIONS_REPOSITORY,
  SessionsRepository,
} from './domain/sessions/sessions.repository';
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from './domain/users/password-hasher';
import { Role, User } from './domain/users/user';
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
    findByEmail: jest.fn(),
    update: jest.fn(),
    setPendingEmail: jest.fn(),
    issueVerificationToken: jest.fn(),
    verifyEmail: jest.fn(),
  };
  const mailer: jest.Mocked<Mailer> = {
    sendVerificationLink: jest.fn(),
  };
  const sessions: jest.Mocked<SessionsRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    delete: jest.fn(),
  };
  const passwordHasher: jest.Mocked<PasswordHasher> = {
    hash: jest.fn(),
    verify: jest.fn(),
  };
  const businesses: jest.Mocked<BusinessesRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
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
    listActiveByBusiness: jest.fn(),
    update: jest.fn(),
    issueVerificationToken: jest.fn(),
    verifyEmail: jest.fn(),
  };
  const services: jest.Mocked<ServicesRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    listActiveByBranch: jest.fn(),
    update: jest.fn(),
    retire: jest.fn(),
  };
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CLOCK)
    .useValue(clock)
    .overrideProvider(USERS_REPOSITORY)
    .useValue(users)
    .overrideProvider(SESSIONS_REPOSITORY)
    .useValue(sessions)
    .overrideProvider(PASSWORD_HASHER)
    .useValue(passwordHasher)
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
    .compile();
  const app = setupApp(moduleRef.createNestApplication());
  await app.init();
  return {
    app,
    clock,
    users,
    sessions,
    passwordHasher,
    mailer,
    businesses,
    branches,
    services,
    employees,
    http: request(app.getHttpServer()),
  };
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;

export const ANA: User = {
  id: 1,
  name: 'Ana Pérez',
  email: 'ana@example.com',
  pendingEmail: null,
  passwordHash: 'stored-hash',
  role: Role.USER,
  emailVerifiedAt: new Date('2025-12-01T00:00:00.000Z'),
  createdAt: new Date('2025-12-01T00:00:00.000Z'),
};

export const VALID_SIGN_UP = {
  name: 'Ana Pérez',
  email: 'ana@example.com',
  password: 'correct-horse-battery',
};

export const BRUNO: User = {
  id: 2,
  name: 'Bruno Díaz',
  email: 'bruno@example.com',
  pendingEmail: null,
  passwordHash: 'stored-hash',
  role: Role.USER,
  emailVerifiedAt: new Date('2025-12-01T00:00:00.000Z'),
  createdAt: new Date('2025-12-01T00:00:00.000Z'),
};

export const ANAS_BUSINESS: Business = {
  id: 1,
  name: "Ana's Salon",
  description: 'Hair and nails',
  ownerId: ANA.id,
};

export const ANAS_BRANCH: Branch = {
  id: 1,
  businessId: ANAS_BUSINESS.id,
  name: 'Downtown',
  address: '123 Main St',
  opensAt: '09:00',
  closesAt: '18:00',
};

/** Ana as the Empleado of her own Negocio: verified at the Clock's starting now. */
export const ANAS_EMPLOYEE: Employee = {
  id: 1,
  businessId: ANAS_BUSINESS.id,
  name: ANA.name,
  email: ANA.email,
  emailVerifiedAt: new TestClock().now(),
  retiredAt: null,
};

export const SESSION_ID = 'session-1';
export const OTHER_SESSION_ID = 'session-2';

/** Makes `bearer(SESSION_ID)` a Sesión of Ana's, issued at the Clock's now. */
export function scriptSession({ clock, sessions }: TestApp) {
  const expiresAt = new Date(clock.now().getTime() + 30 * DAY_MS);
  const findById = sessions.findById.getMockImplementation();
  sessions.findById.mockImplementation(async (id) =>
    id === SESSION_ID
      ? { id: SESSION_ID, userId: ANA.id, expiresAt }
      : (findById?.(id) ?? null),
  );
}

/** Makes `bearer(OTHER_SESSION_ID)` a Sesión of Bruno's, alongside Ana's from scriptSession. */
export function scriptOtherSession({ clock, sessions }: TestApp) {
  const expiresAt = new Date(clock.now().getTime() + 30 * DAY_MS);
  const findById = sessions.findById.getMockImplementation();
  sessions.findById.mockImplementation(async (id) =>
    id === OTHER_SESSION_ID
      ? { id: OTHER_SESSION_ID, userId: BRUNO.id, expiresAt }
      : (findById?.(id) ?? null),
  );
}

export const bearer = (sessionId: string) => ({
  Authorization: `Bearer ${sessionId}`,
});
