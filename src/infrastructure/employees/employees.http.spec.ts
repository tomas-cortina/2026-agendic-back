import {
  BusinessRuleError,
  ConflictError,
  DatabaseOperationError,
} from '../../domain/errors';
import {
  ANAS_BUSINESS,
  ANAS_EMPLOYEE,
  bearer,
  BRUNO,
  createTestApp,
  OTHER_SESSION_ID,
  scriptOtherSession,
  scriptSession,
  SESSION_ID,
  TestApp,
} from '../../test-app';

const PENDING_EMPLOYEE = {
  id: 2,
  businessId: ANAS_BUSINESS.id,
  name: 'Bruno Díaz',
  email: 'bruno@example.com',
  emailVerifiedAt: null,
  retiredAt: null,
};

describe('Empleado', () => {
  let t: TestApp;

  beforeEach(async () => (t = await createTestApp()));
  afterEach(() => t.app.close());

  describe('POST /businesses/:id/employees', () => {
    beforeEach(() => {
      scriptSession(t);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    });

    it("verifies the Empleado at once and sends no mail when the email is an already verified Usuario's", async () => {
      t.users.findByEmail.mockResolvedValue(BRUNO);
      t.employees.create.mockResolvedValue({
        ...PENDING_EMPLOYEE,
        emailVerifiedAt: t.clock.now(),
      });

      const res = await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
        .set(bearer(SESSION_ID))
        .send({ name: 'Bruno Díaz', email: 'bruno@example.com' })
        .expect(201);

      expect(t.employees.create).toHaveBeenCalledWith({
        businessId: ANAS_BUSINESS.id,
        name: 'Bruno Díaz',
        email: 'bruno@example.com',
        emailVerifiedAt: t.clock.now(),
      });
      expect(res.body).toEqual({
        id: PENDING_EMPLOYEE.id,
        name: 'Bruno Díaz',
        email: 'bruno@example.com',
        verified: true,
      });
      expect(t.employees.issueVerificationToken).not.toHaveBeenCalled();
      expect(t.mailer.sendVerificationLink).not.toHaveBeenCalled();
    });

    it.each([
      [
        'no Usuario has that email',
        () => t.users.findByEmail.mockResolvedValue(null),
      ],
      [
        "the Usuario's email is not verified",
        () =>
          t.users.findByEmail.mockResolvedValue({
            ...BRUNO,
            emailVerifiedAt: null,
          }),
      ],
    ])(
      'leaves the Empleado pending and sends a verification link when %s',
      async (_, script) => {
        script();
        t.employees.create.mockResolvedValue(PENDING_EMPLOYEE);
        t.employees.issueVerificationToken.mockResolvedValue('a-token');

        const res = await t.http
          .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
          .set(bearer(SESSION_ID))
          .send({ name: 'Bruno Díaz', email: 'bruno@example.com' })
          .expect(201);

        expect(t.employees.create).toHaveBeenCalledWith({
          businessId: ANAS_BUSINESS.id,
          name: 'Bruno Díaz',
          email: 'bruno@example.com',
          emailVerifiedAt: null,
        });
        expect(t.employees.issueVerificationToken).toHaveBeenCalledWith(
          PENDING_EMPLOYEE.id,
          new Date('2026-01-02T12:00:00.000Z'),
        );
        expect(t.mailer.sendVerificationLink).toHaveBeenCalledWith(
          'bruno@example.com',
          'a-token',
        );
        expect(res.body).toMatchObject({ verified: false });
      },
    );

    it('passes the trimmed name and the trimmed, lowercased email', async () => {
      t.users.findByEmail.mockResolvedValue(null);
      t.employees.create.mockResolvedValue(PENDING_EMPLOYEE);
      t.employees.issueVerificationToken.mockResolvedValue('a-token');

      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
        .set(bearer(SESSION_ID))
        .send({ name: '  Bruno Díaz  ', email: '  Bruno@Example.COM ' })
        .expect(201);

      expect(t.users.findByEmail).toHaveBeenCalledWith('bruno@example.com');
      expect(t.employees.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Bruno Díaz',
          email: 'bruno@example.com',
        }),
      );
    });

    it('answers 409 when the email is already used by an Employee of the same Business', async () => {
      t.users.findByEmail.mockResolvedValue(null);
      t.employees.create.mockRejectedValue(
        new ConflictError('Employee email already in use'),
      );

      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
        .set(bearer(SESSION_ID))
        .send({ name: 'Bruno Díaz', email: 'bruno@example.com' })
        .expect(409);
      expect(t.mailer.sendVerificationLink).not.toHaveBeenCalled();
    });

    it('answers 403 for a session that is not the Dueño', async () => {
      scriptOtherSession(t);

      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
        .set(bearer(OTHER_SESSION_ID))
        .send({ name: 'Bruno Díaz', email: 'bruno@example.com' })
        .expect(403);
      expect(t.employees.create).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Business', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await t.http
        .post('/businesses/999/employees')
        .set(bearer(SESSION_ID))
        .send({ name: 'Bruno Díaz', email: 'bruno@example.com' })
        .expect(404);
    });

    it.each([
      ['a blank name', { name: '   ' }],
      ['a missing name', { name: undefined }],
      ['a malformed email', { email: 'bruno@' }],
      ['a missing email', { email: undefined }],
    ])(
      'rejects %s with 400, without reaching the repositories',
      async (_, override) => {
        await t.http
          .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
          .set(bearer(SESSION_ID))
          .send({ name: 'Bruno Díaz', email: 'bruno@example.com', ...override })
          .expect(400);

        expect(t.employees.create).not.toHaveBeenCalled();
      },
    );
  });

  describe('POST /employees/verification', () => {
    it('verifies the Empleado and answers 204', async () => {
      t.employees.verifyEmail.mockResolvedValue({
        ...PENDING_EMPLOYEE,
        emailVerifiedAt: t.clock.now(),
      });

      await t.http
        .post('/employees/verification')
        .send({ token: 'a-token' })
        .expect(204);

      expect(t.employees.verifyEmail).toHaveBeenCalledWith(
        'a-token',
        new Date('2026-01-01T12:00:00.000Z'),
      );
    });

    it('answers 422 for an unknown, used or expired token', async () => {
      t.employees.verifyEmail.mockRejectedValue(
        new BusinessRuleError('Unknown, used or expired verification token'),
      );

      await t.http
        .post('/employees/verification')
        .send({ token: 'stale-token' })
        .expect(422);
    });

    it('rejects a missing token with 400', async () => {
      await t.http.post('/employees/verification').send({}).expect(400);
      expect(t.employees.verifyEmail).not.toHaveBeenCalled();
    });
  });

  describe('POST /employees/:id/verification/resend', () => {
    beforeEach(() => {
      scriptSession(t);
      t.employees.findById.mockResolvedValue(PENDING_EMPLOYEE);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    });

    it('sends a fresh link, invalidating the previous one, and answers 204', async () => {
      t.employees.issueVerificationToken.mockResolvedValue('fresh-token');

      await t.http
        .post(`/employees/${PENDING_EMPLOYEE.id}/verification/resend`)
        .set(bearer(SESSION_ID))
        .expect(204);

      expect(t.employees.issueVerificationToken).toHaveBeenCalledWith(
        PENDING_EMPLOYEE.id,
        new Date('2026-01-02T12:00:00.000Z'),
      );
      expect(t.mailer.sendVerificationLink).toHaveBeenCalledWith(
        PENDING_EMPLOYEE.email,
        'fresh-token',
      );
    });

    it('answers 422 for an already verified Empleado', async () => {
      t.employees.findById.mockResolvedValue(ANAS_EMPLOYEE);

      await t.http
        .post(`/employees/${ANAS_EMPLOYEE.id}/verification/resend`)
        .set(bearer(SESSION_ID))
        .expect(422);
      expect(t.mailer.sendVerificationLink).not.toHaveBeenCalled();
    });

    it('answers 403 for a session that is not the Dueño', async () => {
      scriptOtherSession(t);

      await t.http
        .post(`/employees/${PENDING_EMPLOYEE.id}/verification/resend`)
        .set(bearer(OTHER_SESSION_ID))
        .expect(403);
    });

    it('answers 404 for an unknown Employee', async () => {
      t.employees.findById.mockResolvedValue(null);

      await t.http
        .post('/employees/999/verification/resend')
        .set(bearer(SESSION_ID))
        .expect(404);
    });
  });

  describe('PATCH /employees/:id', () => {
    beforeEach(() => {
      scriptSession(t);
      t.employees.findById.mockResolvedValue(ANAS_EMPLOYEE);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    });

    it('updates the name, with the same normalisation as sign-up', async () => {
      t.employees.update.mockResolvedValue({
        ...ANAS_EMPLOYEE,
        name: 'Ana María',
      });

      const res = await t.http
        .patch(`/employees/${ANAS_EMPLOYEE.id}`)
        .set(bearer(SESSION_ID))
        .send({ name: '  Ana María  ' })
        .expect(200);

      expect(t.employees.update).toHaveBeenCalledWith(ANAS_EMPLOYEE.id, {
        name: 'Ana María',
      });
      expect(res.body).toEqual({
        id: ANAS_EMPLOYEE.id,
        name: 'Ana María',
        email: ANAS_EMPLOYEE.email,
        verified: true,
      });
    });

    it('answers 403 for a session that is not the Dueño', async () => {
      scriptOtherSession(t);

      await t.http
        .patch(`/employees/${ANAS_EMPLOYEE.id}`)
        .set(bearer(OTHER_SESSION_ID))
        .send({ name: 'Ana María' })
        .expect(403);
      expect(t.employees.update).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Employee', async () => {
      t.employees.findById.mockResolvedValue(null);

      await t.http
        .patch('/employees/999')
        .set(bearer(SESSION_ID))
        .send({ name: 'Ana María' })
        .expect(404);
    });

    it.each([
      ['a blank name', { name: '   ' }],
      ['a missing name', { name: undefined }],
      ['an email: only the name can be changed', { email: 'new@example.com' }],
    ])(
      'rejects %s with 400, without reaching the repository',
      async (_, override) => {
        await t.http
          .patch(`/employees/${ANAS_EMPLOYEE.id}`)
          .set(bearer(SESSION_ID))
          .send({ name: 'Ana María', ...override })
          .expect(400);

        expect(t.employees.update).not.toHaveBeenCalled();
      },
    );
  });

  describe('GET /businesses/:id/employees', () => {
    beforeEach(() => {
      scriptSession(t);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    });

    it('lists the Business Employees not dados de baja as { id, name, email, verified }', async () => {
      t.employees.listActiveByBusiness.mockResolvedValue([
        ANAS_EMPLOYEE,
        PENDING_EMPLOYEE,
      ]);

      const res = await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}/employees`)
        .set(bearer(SESSION_ID))
        .expect(200);

      expect(res.body).toEqual([
        {
          id: ANAS_EMPLOYEE.id,
          name: ANAS_EMPLOYEE.name,
          email: ANAS_EMPLOYEE.email,
          verified: true,
        },
        {
          id: PENDING_EMPLOYEE.id,
          name: PENDING_EMPLOYEE.name,
          email: PENDING_EMPLOYEE.email,
          verified: false,
        },
      ]);
      expect(t.employees.listActiveByBusiness).toHaveBeenCalledWith(
        ANAS_BUSINESS.id,
      );
    });

    it('answers 403 for a session that is not the Dueño', async () => {
      scriptOtherSession(t);

      await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}/employees`)
        .set(bearer(OTHER_SESSION_ID))
        .expect(403);
    });

    it('answers 404 for an unknown Business', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await t.http
        .get('/businesses/999/employees')
        .set(bearer(SESSION_ID))
        .expect(404);
    });
  });

  it('answers a database failure with a generic 500', async () => {
    scriptSession(t);
    t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    t.users.findByEmail.mockResolvedValue(null);
    t.employees.create.mockRejectedValue(
      new DatabaseOperationError('Database operation failed', {
        cause: new Error('connection refused at 10.0.0.1'),
      }),
    );

    const res = await t.http
      .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
      .set(bearer(SESSION_ID))
      .send({ name: 'Bruno Díaz', email: 'bruno@example.com' })
      .expect(500);

    expect(res.body).toEqual({
      statusCode: 500,
      message: 'Database operation failed',
    });
  });
});
