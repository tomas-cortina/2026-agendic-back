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

describe('Usuario', () => {
  let app: INestApplication;
  let clock: TestClock;
  let http: Http;

  beforeEach(async () => ({ app, clock, http } = await createTestApp()));
  afterEach(() => app.close());

  describe('POST /users (sign-up)', () => {
    it('returns a Sesión that expires 30 days later and identifies the new Usuario', async () => {
      const res = await http.post('/users').send(VALID_SIGN_UP).expect(201);

      expect(res.body).toEqual({
        sessionId: expect.any(String),
        expiresAt: new Date(clock.now().getTime() + 30 * DAY_MS).toISOString(),
      });
      const me = await http
        .get('/users/me')
        .set(bearer(res.body.sessionId))
        .expect(200);
      expect(me.body).toEqual({
        id: expect.any(Number),
        name: 'Ana Pérez',
        email: 'ana@example.com',
        role: 'USER',
      });
    });

    it('trims the name and trims and lowercases the email', async () => {
      const sessionId = await signUp(http, {
        name: '  Ana  ',
        email: '  Ana@Example.COM ',
      });

      const me = await http.get('/users/me').set(bearer(sessionId)).expect(200);
      expect(me.body).toMatchObject({ name: 'Ana', email: 'ana@example.com' });
    });

    it('rejects an already registered email, in any casing, with 409', async () => {
      await signUp(http);

      await http
        .post('/users')
        .send({ ...VALID_SIGN_UP, email: ' ANA@example.com' })
        .expect(409);
    });

    it.each([12, 72])('accepts a %i-character password', async (length) => {
      await signUp(http, { password: 'x'.repeat(length) });
    });

    it.each([
      ['a blank name', { name: '   ' }],
      ['a missing name', { name: undefined }],
      ['a malformed email', { email: 'ana@' }],
      ['a missing email', { email: undefined }],
      ['an 11-character password', { password: 'x'.repeat(11) }],
      ['a 73-character password', { password: 'x'.repeat(73) }],
      ['a missing password', { password: undefined }],
      ['an unknown field', { role: 'ADMIN' }],
    ])('rejects %s with 400', async (_, override) => {
      await http
        .post('/users')
        .send({ ...VALID_SIGN_UP, ...override })
        .expect(400);
    });
  });

  describe('PATCH /users/me', () => {
    it('changes name and email with the same normalisation as sign-up', async () => {
      const sessionId = await signUp(http);

      const res = await http
        .patch('/users/me')
        .set(bearer(sessionId))
        .send({ name: '  Ana María ', email: ' AnaMaria@Example.com' })
        .expect(200);

      const profile = {
        id: expect.any(Number),
        name: 'Ana María',
        email: 'anamaria@example.com',
        role: 'USER',
      };
      expect(res.body).toEqual(profile);
      expect((await http.get('/users/me').set(bearer(sessionId))).body).toEqual(
        profile,
      );
      await http
        .post('/sessions')
        .send({
          email: 'anamaria@example.com',
          password: VALID_SIGN_UP.password,
        })
        .expect(201);
    });

    it('changes only the fields sent', async () => {
      const sessionId = await signUp(http);

      const res = await http
        .patch('/users/me')
        .set(bearer(sessionId))
        .send({ name: 'Ana María' })
        .expect(200);

      expect(res.body).toMatchObject({
        name: 'Ana María',
        email: VALID_SIGN_UP.email,
      });
    });

    it('allows keeping the same email', async () => {
      const sessionId = await signUp(http);

      await http
        .patch('/users/me')
        .set(bearer(sessionId))
        .send({ email: 'ANA@example.com' })
        .expect(200);
    });

    it("rejects another Usuario's email, in any casing, with 409", async () => {
      await signUp(http, { email: 'bruno@example.com' });
      const sessionId = await signUp(http);

      await http
        .patch('/users/me')
        .set(bearer(sessionId))
        .send({ email: 'Bruno@Example.com' })
        .expect(409);
    });

    it.each([
      ['a blank name', { name: ' ' }],
      ['a null name', { name: null }],
      ['a malformed email', { email: 'ana@' }],
      ['a null email', { email: null }],
      ['a password', { password: 'another-password-123' }],
      ['a role', { role: 'ADMIN' }],
    ])('rejects %s with 400', async (_, body) => {
      const sessionId = await signUp(http);

      await http
        .patch('/users/me')
        .set(bearer(sessionId))
        .send(body)
        .expect(400);
    });
  });

  it.each(['/users', '/users/1'])('GET %s does not exist', async (path) => {
    const sessionId = await signUp(http);

    await http.get(path).set(bearer(sessionId)).expect(404);
  });

  it('allows cross-origin requests from the front', async () => {
    const res = await http
      .options('/users')
      .set('Origin', 'http://localhost:3001')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);

    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});
