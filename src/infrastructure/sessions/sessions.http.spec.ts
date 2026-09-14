import { INestApplication } from '@nestjs/common';
import {
  bearer,
  createTestApp,
  DAY_MS,
  Http,
  signUp,
  TestClock,
  VALID_SIGN_UP,
} from '../../test-app';

describe('Sesión', () => {
  let app: INestApplication;
  let clock: TestClock;
  let http: Http;

  beforeEach(async () => ({ app, clock, http } = await createTestApp()));
  afterEach(() => app.close());

  describe('POST /sessions (sign-in)', () => {
    it('returns a new Sesión that expires 30 days later', async () => {
      const signUpSessionId = await signUp(http);
      clock.advance(DAY_MS);

      const res = await http
        .post('/sessions')
        .send({ email: ' ANA@example.com ', password: VALID_SIGN_UP.password })
        .expect(201);

      expect(res.body).toEqual({
        sessionId: expect.any(String),
        expiresAt: new Date(clock.now().getTime() + 30 * DAY_MS).toISOString(),
      });
      expect(res.body.sessionId).not.toBe(signUpSessionId);
      await http.get('/users/me').set(bearer(res.body.sessionId)).expect(200);
    });

    it('answers an unknown email and a wrong password with the same 401', async () => {
      await signUp(http);

      const unknownEmail = await http
        .post('/sessions')
        .send({ email: 'nobody@example.com', password: VALID_SIGN_UP.password })
        .expect(401);
      const wrongPassword = await http
        .post('/sessions')
        .send({ email: VALID_SIGN_UP.email, password: 'wrong-password-123' })
        .expect(401);

      expect(wrongPassword.body).toEqual(unknownEmail.body);
    });

    it.each([
      ['a malformed email', { email: 'ana', password: VALID_SIGN_UP.password }],
      ['a missing password', { email: VALID_SIGN_UP.email }],
    ])('rejects %s with 400', async (_, body) => {
      await http.post('/sessions').send(body).expect(400);
    });
  });

  describe('DELETE /sessions/current (sign-out)', () => {
    it('signs out the current Sesión only', async () => {
      const signUpSessionId = await signUp(http);
      const signIn = await http
        .post('/sessions')
        .send({ email: VALID_SIGN_UP.email, password: VALID_SIGN_UP.password })
        .expect(201);

      await http
        .delete('/sessions/current')
        .set(bearer(signUpSessionId))
        .expect(204);

      await http.get('/users/me').set(bearer(signUpSessionId)).expect(401);
      await http
        .get('/users/me')
        .set(bearer(signIn.body.sessionId))
        .expect(200);
    });
  });

  describe.each([
    ['get', '/users/me', 200],
    ['patch', '/users/me', 200],
    ['delete', '/sessions/current', 204],
  ] as const)('%s %s needs a Sesión', (method, path, successStatus) => {
    const call = (headers: Record<string, string> = {}) =>
      http[method](path).set(headers).send({});

    it('rejects a missing Authorization header with 401', async () => {
      await call().expect(401);
    });

    it('rejects a Sesión id sent without the Bearer scheme with 401', async () => {
      const sessionId = await signUp(http);

      await call({ Authorization: sessionId }).expect(401);
    });

    it('rejects an unknown Sesión with 401', async () => {
      await call(bearer('not-a-session')).expect(401);
    });

    it('accepts a Sesión until just before 30 days after issue', async () => {
      const sessionId = await signUp(http);
      clock.advance(30 * DAY_MS - 1);

      await call(bearer(sessionId)).expect(successStatus);
    });

    it('rejects a Sesión 30 days after issue with 401', async () => {
      const sessionId = await signUp(http);
      clock.advance(30 * DAY_MS);

      await call(bearer(sessionId)).expect(401);
    });

    it('rejects a signed-out Sesión with 401', async () => {
      const sessionId = await signUp(http);
      await http.delete('/sessions/current').set(bearer(sessionId)).expect(204);

      await call(bearer(sessionId)).expect(401);
    });
  });
});
