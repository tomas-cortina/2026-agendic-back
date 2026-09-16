import {
  BusinessRuleError,
  ConflictError,
  DatabaseOperationError,
} from '../../domain/errors';
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
    const UNVERIFIED_ANA = { ...ANA, emailVerifiedAt: null };

    beforeEach(() => {
      t.passwordHasher.hash.mockResolvedValue('hashed-password');
      t.users.create.mockResolvedValue(UNVERIFIED_ANA);
      t.users.issueVerificationToken.mockResolvedValue('a-token');
    });

    it('creates the Usuario unverified and sends a verification link, without a Sesión', async () => {
      const res = await t.http.post('/users').send(VALID_SIGN_UP).expect(201);

      expect(res.body).toEqual({
        id: UNVERIFIED_ANA.id,
        name: UNVERIFIED_ANA.name,
        email: UNVERIFIED_ANA.email,
        role: UNVERIFIED_ANA.role,
      });
      expect(t.users.issueVerificationToken).toHaveBeenCalledWith(
        UNVERIFIED_ANA.id,
        new Date('2026-01-02T12:00:00.000Z'),
      );
      expect(t.mailer.sendVerificationLink).toHaveBeenCalledWith(
        UNVERIFIED_ANA.email,
        'a-token',
      );
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
      expect(t.mailer.sendVerificationLink).not.toHaveBeenCalled();
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
        expect(t.mailer.sendVerificationLink).not.toHaveBeenCalled();
      },
    );
  });

  describe('POST /users/verification', () => {
    it('verifies the email and returns a new Sesión', async () => {
      t.users.verifyEmail.mockResolvedValue(ANA);
      t.sessions.create.mockImplementation(async (data) => ({
        id: 'new-session',
        ...data,
      }));

      const res = await t.http
        .post('/users/verification')
        .send({ token: 'a-token' })
        .expect(201);

      expect(t.users.verifyEmail).toHaveBeenCalledWith(
        'a-token',
        new Date('2026-01-01T12:00:00.000Z'),
      );
      expect(res.body).toEqual({
        sessionId: 'new-session',
        expiresAt: '2026-01-31T12:00:00.000Z',
      });
    });

    it('answers 422 for an unknown, used or expired token', async () => {
      t.users.verifyEmail.mockRejectedValue(
        new BusinessRuleError('Unknown, used or expired verification token'),
      );

      await t.http
        .post('/users/verification')
        .send({ token: 'stale-token' })
        .expect(422);
      expect(t.sessions.create).not.toHaveBeenCalled();
    });

    it('answers 409 when the pending email was registered by someone else meanwhile', async () => {
      t.users.verifyEmail.mockRejectedValue(
        new ConflictError('Email already registered'),
      );

      await t.http
        .post('/users/verification')
        .send({ token: 'a-token' })
        .expect(409);
    });

    it('rejects a missing token with 400', async () => {
      await t.http.post('/users/verification').send({}).expect(400);
      expect(t.users.verifyEmail).not.toHaveBeenCalled();
    });
  });

  describe('POST /users/verification/resend', () => {
    it('sends a fresh link and always answers 204', async () => {
      t.users.findByEmail.mockResolvedValue({ ...ANA, emailVerifiedAt: null });
      t.users.issueVerificationToken.mockResolvedValue('fresh-token');

      await t.http
        .post('/users/verification/resend')
        .send({ email: ' Ana@Example.com ' })
        .expect(204);

      expect(t.users.findByEmail).toHaveBeenCalledWith('ana@example.com');
      expect(t.users.issueVerificationToken).toHaveBeenCalledWith(
        ANA.id,
        new Date('2026-01-02T12:00:00.000Z'),
      );
      expect(t.mailer.sendVerificationLink).toHaveBeenCalledWith(
        ANA.email,
        'fresh-token',
      );
    });

    it.each([
      ['an unknown email', () => t.users.findByEmail.mockResolvedValue(null)],
      [
        'an already verified Usuario',
        () => t.users.findByEmail.mockResolvedValue(ANA),
      ],
    ])('answers 204 without sending mail for %s', async (_, script) => {
      script();

      await t.http
        .post('/users/verification/resend')
        .send({ email: 'ana@example.com' })
        .expect(204);

      expect(t.mailer.sendVerificationLink).not.toHaveBeenCalled();
    });

    it('rejects a malformed email with 400', async () => {
      await t.http
        .post('/users/verification/resend')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
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

    it('also shows the pending email, if there is one', async () => {
      scriptSession(t);
      t.users.findById.mockResolvedValue({
        ...ANA,
        pendingEmail: 'new@example.com',
      });

      const res = await t.http
        .get('/users/me')
        .set(bearer(SESSION_ID))
        .expect(200);

      expect(res.body).toMatchObject({ pendingEmail: 'new@example.com' });
    });
  });

  describe('PATCH /users/me', () => {
    beforeEach(() => {
      scriptSession(t);
      t.users.update.mockResolvedValue(ANA);
      t.users.findById.mockResolvedValue(ANA);
    });

    it('updates the name at once, with the same normalisation as sign-up', async () => {
      t.users.update.mockResolvedValue({ ...ANA, name: 'Ana María' });

      const res = await t.http
        .patch('/users/me')
        .set(bearer(SESSION_ID))
        .send({ name: '  Ana María ' })
        .expect(200);

      expect(t.users.update).toHaveBeenCalledWith(ANA.id, {
        name: 'Ana María',
      });
      expect(res.body).toEqual({
        id: 1,
        name: 'Ana María',
        email: 'ana@example.com',
        role: 'USER',
      });
      expect(t.users.setPendingEmail).not.toHaveBeenCalled();
    });

    it('stores a new email as pending, sends a link, and keeps the current email working', async () => {
      t.users.setPendingEmail.mockResolvedValue({
        ...ANA,
        pendingEmail: 'anamaria@example.com',
      });
      t.users.issueVerificationToken.mockResolvedValue('a-token');

      const res = await t.http
        .patch('/users/me')
        .set(bearer(SESSION_ID))
        .send({ email: ' AnaMaria@Example.com' })
        .expect(200);

      expect(t.users.setPendingEmail).toHaveBeenCalledWith(
        ANA.id,
        'anamaria@example.com',
      );
      expect(t.users.issueVerificationToken).toHaveBeenCalledWith(
        ANA.id,
        new Date('2026-01-02T12:00:00.000Z'),
      );
      expect(t.mailer.sendVerificationLink).toHaveBeenCalledWith(
        'anamaria@example.com',
        'a-token',
      );
      expect(res.body).toEqual({
        id: 1,
        name: 'Ana Pérez',
        email: 'ana@example.com',
        pendingEmail: 'anamaria@example.com',
        role: 'USER',
      });
      expect(t.users.update).not.toHaveBeenCalled();
    });

    it('answers 409 when the new email is already registered', async () => {
      t.users.setPendingEmail.mockRejectedValue(
        new ConflictError('Email already registered'),
      );

      await t.http
        .patch('/users/me')
        .set(bearer(SESSION_ID))
        .send({ email: 'bruno@example.com' })
        .expect(409);
      expect(t.mailer.sendVerificationLink).not.toHaveBeenCalled();
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
