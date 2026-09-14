import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';
import { CLOCK, Clock } from './domain/clock';

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

/** The full app as main.ts configures it, with a controllable Clock. */
export async function createTestApp() {
  const clock = new TestClock();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CLOCK)
    .useValue(clock)
    .compile();
  const app = setupApp(moduleRef.createNestApplication());
  await app.init();
  return { app, clock, http: request(app.getHttpServer()) };
}

export type Http = Awaited<ReturnType<typeof createTestApp>>['http'];

export const VALID_SIGN_UP = {
  name: 'Ana Pérez',
  email: 'ana@example.com',
  password: 'correct-horse-battery',
};

export async function signUp(
  http: Http,
  body: Partial<typeof VALID_SIGN_UP> = {},
) {
  const res = await http
    .post('/users')
    .send({ ...VALID_SIGN_UP, ...body })
    .expect(201);
  return res.body.sessionId as string;
}

export const bearer = (sessionId: string) => ({
  Authorization: `Bearer ${sessionId}`,
});
