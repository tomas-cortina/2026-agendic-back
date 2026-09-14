import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';
import { CLOCK, Clock } from './domain/clock';
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
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CLOCK)
    .useValue(clock)
    .overrideProvider(USERS_REPOSITORY)
    .useValue(users)
    .overrideProvider(SESSIONS_REPOSITORY)
    .useValue(sessions)
    .overrideProvider(PASSWORD_HASHER)
    .useValue(passwordHasher)
    .compile();
  const app = setupApp(moduleRef.createNestApplication());
  await app.init();
  return {
    app,
    clock,
    users,
    sessions,
    passwordHasher,
    http: request(app.getHttpServer()),
  };
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;

export const ANA: User = {
  id: 1,
  name: 'Ana Pérez',
  email: 'ana@example.com',
  passwordHash: 'stored-hash',
  role: Role.USER,
  createdAt: new Date('2025-12-01T00:00:00.000Z'),
};

export const VALID_SIGN_UP = {
  name: 'Ana Pérez',
  email: 'ana@example.com',
  password: 'correct-horse-battery',
};

export const SESSION_ID = 'session-1';

/** Makes `bearer(SESSION_ID)` a Sesión of Ana's, issued at the Clock's now. */
export function scriptSession({ clock, sessions }: TestApp) {
  sessions.findById.mockResolvedValue({
    id: SESSION_ID,
    userId: ANA.id,
    expiresAt: new Date(clock.now().getTime() + 30 * DAY_MS),
  });
}

export const bearer = (sessionId: string) => ({
  Authorization: `Bearer ${sessionId}`,
});
