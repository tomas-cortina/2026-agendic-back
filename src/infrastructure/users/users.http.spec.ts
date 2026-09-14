import { ConflictError, DatabaseOperationError } from '../../domain/errors';
import {
  ANA,
  bearer,
  createTestApp,
  scriptSession,
  SESSION_ID,
  TestApp,
  VALID_SIGN_UP,
} from '../../test-app';

describe('Usuario', () => {
  let t: TestApp;

  beforeEach(async () => (t = await createTestApp()));
  afterEach(() => t.app.close());

  describe('POST /users (sign-up)', () => {
    beforeEach(() => {
      t.passwordHasher.hash.mockResolvedValue('hashed-password');
      t.users.create.mockResolvedValue(ANA);
      t.sessions.create.mockImplementation(async (data) => ({
        id: 'new-session',
        ...data,
      }));
    });

    it('returns a Sesión of the new Usuario that expires 30 days after now', async () => {
      const res = await t.http.post('/users').send(VALID_SIGN_UP).expect(201);

      expect(res.body).toEqual({
        sessionId: 'new-session',
        expiresAt: '2026-01-31T12:00:00.000Z',
      });
      expect(t.sessions.create).toHaveBeenCalledWith({
        userId: ANA.id,
        expiresAt: new Date('2026-01-31T12:00:00.000Z'),
      });
    });

    it('passes the trimmed name, the trimmed and lowercased email and only the hashed password', async () => {
      await t.http
        .post('/users')
        .send({
          ...VALID_SIGN_UP,
          name: '  Ana  ',
          email: '  Ana@Example.COM ',
        })
        .expect(201);

      expect(t.passwordHasher.hash).toHaveBeenCalledWith(
        VALID_SIGN_UP.password,
      );
      expect(t.users.create).toHaveBeenCalledWith({
        name: 'Ana',
        email: 'ana@example.com',
        passwordHash: 'hashed-password',
      });
    });

    it('answers 409 when the email is already registered', async () => {
      t.users.create.mockRejectedValue(
        new ConflictError('Email already registered'),
      );

      await t.http.post('/users').send(VALID_SIGN_UP).expect(409);
      expect(t.sessions.create).not.toHaveBeenCalled();
    });

    it('answers a database failure with a generic 500', async () => {
      t.users.create.mockRejectedValue(
        new DatabaseOperationError('Database operation failed', {
          cause: new Error('connection refused at 10.0.0.1'),
        }),
      );

      const res = await t.http.post('/users').send(VALID_SIGN_UP).expect(500);

      expect(res.body).toEqual({
        statusCode: 500,
        message: 'Database operation failed',
      });
    });

    it.each([12, 72])('accepts a %i-character password', async (length) => {
      await t.http
        .post('/users')
        .send({ ...VALID_SIGN_UP, password: 'x'.repeat(length) })
        .expect(201);
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
    ])(
      'rejects %s with 400, without reaching the repositories',
      async (_, override) => {
        await t.http
          .post('/users')
          .send({ ...VALID_SIGN_UP, ...override })
          .expect(400);

        expect(t.users.create).not.toHaveBeenCalled();
        expect(t.sessions.create).not.toHaveBeenCalled();
      },
    );
  });

  describe('GET /users/me', () => {
    it('returns the Usuario of the Sesión as { id, name, email, role }, never passwordHash', async () => {
      scriptSession(t);
      t.users.findById.mockResolvedValue(ANA);

      const res = await t.http
        .get('/users/me')
        .set(bearer(SESSION_ID))
        .expect(200);

      expect(res.body).toEqual({
        id: 1,
        name: 'Ana Pérez',
        email: 'ana@example.com',
        role: 'USER',
      });
      expect(t.users.findById).toHaveBeenCalledWith(ANA.id);
    });
  });

  describe('PATCH /users/me', () => {
    beforeEach(() => {
      scriptSession(t);
      t.users.update.mockResolvedValue(ANA);
    });

    it('passes name and email with the same normalisation as sign-up, and returns the updated Usuario', async () => {
      t.users.update.mockResolvedValue({
        ...ANA,
        name: 'Ana María',
        email: 'anamaria@example.com',
      });

      const res = await t.http
        .patch('/users/me')
        .set(bearer(SESSION_ID))
        .send({ name: '  Ana María ', email: ' AnaMaria@Example.com' })
        .expect(200);

      expect(t.users.update).toHaveBeenCalledWith(ANA.id, {
        name: 'Ana María',
        email: 'anamaria@example.com',
      });
      expect(res.body).toEqual({
        id: 1,
        name: 'Ana María',
        email: 'anamaria@example.com',
        role: 'USER',
      });
    });

    it('passes only the fields sent', async () => {
      await t.http
        .patch('/users/me')
        .set(bearer(SESSION_ID))
        .send({ name: 'Ana María' })
        .expect(200);

      expect(t.users.update).toHaveBeenCalledWith(ANA.id, {
        name: 'Ana María',
      });
    });

    it("answers 409 when the email is another Usuario's", async () => {
      t.users.update.mockRejectedValue(
        new ConflictError('Email already registered'),
      );

      await t.http
        .patch('/users/me')
        .set(bearer(SESSION_ID))
        .send({ email: 'bruno@example.com' })
        .expect(409);
    });

    it.each([
      ['a blank name', { name: ' ' }],
      ['a null name', { name: null }],
      ['a malformed email', { email: 'ana@' }],
      ['a null email', { email: null }],
      ['a password', { password: 'another-password-123' }],
      ['a role', { role: 'ADMIN' }],
    ])(
      'rejects %s with 400, without reaching the repository',
      async (_, body) => {
        await t.http
          .patch('/users/me')
          .set(bearer(SESSION_ID))
          .send(body)
          .expect(400);

        expect(t.users.update).not.toHaveBeenCalled();
      },
    );
  });

  it.each(['/users', '/users/1'])('GET %s does not exist', async (path) => {
    scriptSession(t);

    await t.http.get(path).set(bearer(SESSION_ID)).expect(404);
  });

  it('allows cross-origin requests from the front', async () => {
    const res = await t.http
      .options('/users')
      .set('Origin', 'http://localhost:3001')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);

    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});
