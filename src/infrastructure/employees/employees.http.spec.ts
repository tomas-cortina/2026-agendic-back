import {
  ConflictError,
  DatabaseOperationError,
  ExpiredError,
  InvalidCodeError,
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
      expect(t.employees.issueVerificationCode).not.toHaveBeenCalled();
      expect(t.mailer.sendVerificationCode).not.toHaveBeenCalled();
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
      'leaves the Empleado pending and sends a verification code when %s',
      async (_, script) => {
        script();
        t.employees.create.mockResolvedValue(PENDING_EMPLOYEE);
        t.employees.issueVerificationCode.mockResolvedValue('ABCDEF');

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
        expect(t.employees.issueVerificationCode).toHaveBeenCalledWith(
          PENDING_EMPLOYEE.id,
          new Date('2026-01-02T12:00:00.000Z'),
        );
        expect(t.mailer.sendVerificationCode).toHaveBeenCalledWith(
          'bruno@example.com',
          'ABCDEF',
        );
        expect(res.body).toMatchObject({ verified: false });
      },
    );

    it('passes the trimmed name and the trimmed, lowercased email', async () => {
      t.users.findByEmail.mockResolvedValue(null);
      t.employees.create.mockResolvedValue(PENDING_EMPLOYEE);
      t.employees.issueVerificationCode.mockResolvedValue('ABCDEF');

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
      expect(t.mailer.sendVerificationCode).not.toHaveBeenCalled();
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
        .send({ email: 'bruno@example.com', code: 'abcdef' })
        .expect(204);

      expect(t.employees.verifyEmail).toHaveBeenCalledWith(
        'bruno@example.com',
        'ABCDEF',
        new Date('2026-01-01T12:00:00.000Z'),
      );
    });

    it('answers 400 for an unknown or already used code', async () => {
      t.employees.verifyEmail.mockRejectedValue(
        new InvalidCodeError('Unknown or already used verification code'),
      );

      await t.http
        .post('/employees/verification')
        .send({ email: 'bruno@example.com', code: 'ABCDEF' })
        .expect(400);
    });

    it('answers 410 for an expired code', async () => {
      t.employees.verifyEmail.mockRejectedValue(
        new ExpiredError('Verification code expired'),
      );

      await t.http
        .post('/employees/verification')
        .send({ email: 'bruno@example.com', code: 'ABCDEF' })
        .expect(410);
    });

    it('rejects a missing email or code with 400', async () => {
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

    it('sends a fresh code, invalidating the previous one, and answers 204', async () => {
      t.employees.issueVerificationCode.mockResolvedValue('FRESHC');

      await t.http
        .post(`/employees/${PENDING_EMPLOYEE.id}/verification/resend`)
        .set(bearer(SESSION_ID))
        .expect(204);

      expect(t.employees.issueVerificationCode).toHaveBeenCalledWith(
        PENDING_EMPLOYEE.id,
        new Date('2026-01-02T12:00:00.000Z'),
      );
      expect(t.mailer.sendVerificationCode).toHaveBeenCalledWith(
        PENDING_EMPLOYEE.email,
        'FRESHC',
      );
    });

    it('answers 422 for an already verified Empleado', async () => {
      t.employees.findById.mockResolvedValue(ANAS_EMPLOYEE);

      await t.http
        .post(`/employees/${ANAS_EMPLOYEE.id}/verification/resend`)
        .set(bearer(SESSION_ID))
        .expect(422);
      expect(t.mailer.sendVerificationCode).not.toHaveBeenCalled();
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

  describe('DELETE /employees/:id', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.employees.findById.mockResolvedValue(ANAS_EMPLOYEE);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.services.listActiveByEmployee.mockResolvedValue([]);
      t.employees.retire.mockResolvedValue({
        employee: { ...ANAS_EMPLOYEE, retiredAt: new Date() },
        cancelledBookings: 0,
      });
    });

    it('gives the Empleado de baja, for the Dueño', async () => {
      const res = await t.http
        .delete(`/employees/${ANAS_EMPLOYEE.id}`)
        .set(bearer(SESSION_ID))
        .expect(200);

      expect(t.employees.retire).toHaveBeenCalledWith(
        ANAS_EMPLOYEE.id,
        expect.any(Date),
      );
      expect(res.body).toEqual({ cancelledBookings: 0 });
    });

    it('reports how many future Turnos it cancelled', async () => {
      t.employees.retire.mockResolvedValue({
        employee: { ...ANAS_EMPLOYEE, retiredAt: new Date() },
        cancelledBookings: 5,
      });

      const res = await t.http
        .delete(`/employees/${ANAS_EMPLOYEE.id}`)
        .set(bearer(SESSION_ID))
        .expect(200);

      expect(res.body).toEqual({ cancelledBookings: 5 });
    });

    it("answers 422 and changes nothing when they're the last verified Empleado of a Servicio not dado de baja", async () => {
      t.services.listActiveByEmployee.mockResolvedValue([
        {
          id: 1,
          branchId: 1,
          name: 'Haircut',
          description: null,
          durationMinutes: 30,
          price: 20,
          retiredAt: null,
          employees: [{ id: ANAS_EMPLOYEE.id, name: ANAS_EMPLOYEE.name }],
        },
      ]);

      await t.http
        .delete(`/employees/${ANAS_EMPLOYEE.id}`)
        .set(bearer(SESSION_ID))
        .expect(422);

      expect(t.employees.retire).not.toHaveBeenCalled();
    });

    it('gives them de baja when other Servicios have another verified Empleado', async () => {
      t.services.listActiveByEmployee.mockResolvedValue([
        {
          id: 1,
          branchId: 1,
          name: 'Haircut',
          description: null,
          durationMinutes: 30,
          price: 20,
          retiredAt: null,
          employees: [
            { id: ANAS_EMPLOYEE.id, name: ANAS_EMPLOYEE.name },
            { id: 99, name: 'Bruno Díaz' },
          ],
        },
      ]);

      await t.http
        .delete(`/employees/${ANAS_EMPLOYEE.id}`)
        .set(bearer(SESSION_ID))
        .expect(200);

      expect(t.employees.retire).toHaveBeenCalled();
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.delete(`/employees/${ANAS_EMPLOYEE.id}`).expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .delete(`/employees/${ANAS_EMPLOYEE.id}`)
        .set(bearer(OTHER_SESSION_ID))
        .expect(403);

      expect(t.employees.retire).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Empleado', async () => {
      t.employees.findById.mockResolvedValue(null);

      await t.http.delete('/employees/999').set(bearer(SESSION_ID)).expect(404);
    });
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
