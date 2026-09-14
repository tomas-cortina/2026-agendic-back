import {
  ANA,
  bearer,
  createTestApp,
  DAY_MS,
  scriptSession,
  SESSION_ID,
  TestApp,
  VALID_SIGN_UP,
} from '../../test-app';

describe('Sesión', () => {
  let t: TestApp;

  beforeEach(async () => (t = await createTestApp()));
  afterEach(() => t.app.close());

  describe('POST /sessions (sign-in)', () => {
    const credentials = {
      email: VALID_SIGN_UP.email,
      password: VALID_SIGN_UP.password,
    };

    beforeEach(() => {
      t.sessions.create.mockImplementation(async (data) => ({
        id: 'new-session',
        ...data,
      }));
    });

    it('returns a new Sesión, expiring 30 days after now, when the password verifies', async () => {
      t.users.findByEmail.mockResolvedValue(ANA);
      t.passwordHasher.verify.mockResolvedValue(true);

      const res = await t.http
        .post('/sessions')
        .send({ ...credentials, email: ' ANA@example.com ' })
        .expect(201);

      expect(res.body).toEqual({
        sessionId: 'new-session',
        expiresAt: '2026-01-31T12:00:00.000Z',
      });
      expect(t.users.findByEmail).toHaveBeenCalledWith('ana@example.com');
      expect(t.passwordHasher.verify).toHaveBeenCalledWith(
        VALID_SIGN_UP.password,
        ANA.passwordHash,
      );
      expect(t.sessions.create).toHaveBeenCalledWith({
        userId: ANA.id,
        expiresAt: new Date('2026-01-31T12:00:00.000Z'),
      });
    });

    it.each([
      ['an unknown email', () => t.users.findByEmail.mockResolvedValue(null)],
      [
        'a wrong password',
        () => {
          t.users.findByEmail.mockResolvedValue(ANA);
          t.passwordHasher.verify.mockResolvedValue(false);
        },
      ],
    ])('answers %s with the same 401', async (_, script) => {
      script();

      const res = await t.http.post('/sessions').send(credentials).expect(401);

      expect(res.body).toEqual({
        statusCode: 401,
        message: 'Invalid email or password',
      });
      expect(t.sessions.create).not.toHaveBeenCalled();
    });

    it('still hashes the password once for an unknown email, so timing does not reveal registered emails', async () => {
      t.users.findByEmail.mockResolvedValue(null);

      await t.http.post('/sessions').send(credentials).expect(401);

      expect(t.passwordHasher.hash).toHaveBeenCalledTimes(1);
      expect(t.passwordHasher.hash).toHaveBeenCalledWith(
        VALID_SIGN_UP.password,
      );
    });

    it.each([
      ['a malformed email', { email: 'ana', password: VALID_SIGN_UP.password }],
      ['a missing password', { email: VALID_SIGN_UP.email }],
    ])('rejects %s with 400', async (_, body) => {
      await t.http.post('/sessions').send(body).expect(400);

      expect(t.users.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /sessions/current (sign-out)', () => {
    it('deletes the current Sesión through the Sesiones repository', async () => {
      scriptSession(t);

      await t.http
        .delete('/sessions/current')
        .set(bearer(SESSION_ID))
        .expect(204);

      expect(t.sessions.delete).toHaveBeenCalledWith(SESSION_ID);
    });
  });

  describe.each([
    ['get', '/users/me', 200],
    ['patch', '/users/me', 200],
    ['delete', '/sessions/current', 204],
  ] as const)('%s %s needs a Sesión', (method, path, successStatus) => {
    const call = (headers: Record<string, string> = {}) =>
      t.http[method](path).set(headers).send({});

    beforeEach(() => {
      t.users.findById.mockResolvedValue(ANA);
      t.users.update.mockResolvedValue(ANA);
    });

    it('rejects a missing Authorization header with 401', async () => {
      await call().expect(401);
    });

    it('rejects a Sesión id sent without the Bearer scheme with 401', async () => {
      scriptSession(t);

      await call({ Authorization: SESSION_ID }).expect(401);
    });

    it('rejects an unknown Sesión with 401', async () => {
      t.sessions.findById.mockResolvedValue(null);

      await call(bearer('not-a-session')).expect(401);
      expect(t.sessions.findById).toHaveBeenCalledWith('not-a-session');
    });

    it('accepts a Sesión until just before 30 days after issue', async () => {
      scriptSession(t);
      t.clock.advance(30 * DAY_MS - 1);

      await call(bearer(SESSION_ID)).expect(successStatus);
    });

    it('rejects a Sesión 30 days after issue with 401', async () => {
      scriptSession(t);
      t.clock.advance(30 * DAY_MS);

      await call(bearer(SESSION_ID)).expect(401);
    });
  });
});
