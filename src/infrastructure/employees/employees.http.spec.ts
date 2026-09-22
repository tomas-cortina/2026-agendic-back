import { DatabaseOperationError, UnauthenticatedError } from '../../domain/errors';
import { ServiceCategory } from '../../domain/services/service';
import {
  ANA,
  ANAS_BUSINESS,
  ANAS_EMPLOYEE,
  bearer,
  createTestApp,
  OTHER_CLERK_TOKEN,
  scriptEmployeeSession,
  scriptOtherSession,
  scriptSession,
  CLERK_TOKEN,
  TestApp,
} from '../../test-app';

const OTHER_EMPLOYEE = {
  id: 2,
  businessId: ANAS_BUSINESS.id,
  clerkId: 'user_clerk_bruno_the_employee',
  name: 'Bruno Díaz',
  email: 'bruno@example.com',
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
      t.users.findById.mockResolvedValue(ANA);
    });

    it("invites the email to the Business's Clerk Organization and answers 202", async () => {
      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ email: 'bruno@example.com' })
        .expect(202);

      expect(t.clerkAuth.inviteToOrganization).toHaveBeenCalledWith(
        ANAS_BUSINESS.clerkOrgId,
        'bruno@example.com',
        ANA.clerkId,
      );
      expect(t.employees.create).not.toHaveBeenCalled();
    });

    it('passes the trimmed, lowercased email', async () => {
      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ email: '  Bruno@Example.COM ' })
        .expect(202);

      expect(t.clerkAuth.inviteToOrganization).toHaveBeenCalledWith(
        ANAS_BUSINESS.clerkOrgId,
        'bruno@example.com',
        ANA.clerkId,
      );
    });

    it('answers 403 for a session that is not the Dueño', async () => {
      scriptOtherSession(t);

      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ email: 'bruno@example.com' })
        .expect(403);
      expect(t.clerkAuth.inviteToOrganization).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Business', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await t.http
        .post('/businesses/999/employees')
        .set(bearer(CLERK_TOKEN))
        .send({ email: 'bruno@example.com' })
        .expect(404);
    });

    it.each([
      ['a malformed email', { email: 'bruno@' }],
      ['a missing email', { email: undefined }],
    ])(
      'rejects %s with 400, without reaching the repositories',
      async (_, override) => {
        await t.http
          .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
          .set(bearer(CLERK_TOKEN))
          .send(override)
          .expect(400);

        expect(t.clerkAuth.inviteToOrganization).not.toHaveBeenCalled();
      },
    );
  });

  describe('GET /employees/me', () => {
    it("resolves the Clerk JWT to the caller's own Empleado record", async () => {
      scriptEmployeeSession(t);
      t.employees.findById.mockResolvedValue(ANAS_EMPLOYEE);

      const res = await t.http
        .get('/employees/me')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual({
        id: ANAS_EMPLOYEE.id,
        name: ANAS_EMPLOYEE.name,
        email: ANAS_EMPLOYEE.email,
      });
    });

    it('creates the local Empleado just-in-time on its first sight, from the token\'s Organization', async () => {
      t.clerkAuth.verifyToken.mockResolvedValue({
        clerkId: 'user_clerk_new_employee',
        orgId: ANAS_BUSINESS.clerkOrgId,
      });
      t.employees.findByClerkId.mockResolvedValue(null);
      t.businesses.findByClerkOrgId.mockResolvedValue(ANAS_BUSINESS);
      t.clerkAuth.getProfile.mockResolvedValue({
        name: 'Bruno Díaz',
        email: 'bruno@example.com',
      });
      const created = {
        ...OTHER_EMPLOYEE,
        clerkId: 'user_clerk_new_employee',
      };
      t.employees.create.mockResolvedValue(created);
      t.employees.findById.mockResolvedValue(created);

      const res = await t.http
        .get('/employees/me')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.employees.create).toHaveBeenCalledWith({
        businessId: ANAS_BUSINESS.id,
        clerkId: 'user_clerk_new_employee',
        name: 'Bruno Díaz',
        email: 'bruno@example.com',
      });
      expect(res.body).toMatchObject({ name: 'Bruno Díaz' });
    });

    it('answers 401 when the token carries no active Organization and no Empleado exists yet', async () => {
      t.clerkAuth.verifyToken.mockResolvedValue({
        clerkId: 'user_clerk_new_employee',
        orgId: null,
      });
      t.employees.findByClerkId.mockResolvedValue(null);

      await t.http.get('/employees/me').expect(401);
      expect(t.businesses.findByClerkOrgId).not.toHaveBeenCalled();
    });

    it("answers 401 for an Organization that maps to no Business", async () => {
      t.clerkAuth.verifyToken.mockResolvedValue({
        clerkId: 'user_clerk_new_employee',
        orgId: 'org_unknown',
      });
      t.employees.findByClerkId.mockResolvedValue(null);
      t.businesses.findByClerkOrgId.mockResolvedValue(null);

      await t.http.get('/employees/me').expect(401);
      expect(t.employees.create).not.toHaveBeenCalled();
    });

    it('answers 401 without a Clerk token', async () => {
      t.clerkAuth.verifyToken.mockRejectedValue(
        new UnauthenticatedError('Missing Clerk token'),
      );

      await t.http.get('/employees/me').expect(401);
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
        .set(bearer(CLERK_TOKEN))
        .send({ name: '  Ana María  ' })
        .expect(200);

      expect(t.employees.update).toHaveBeenCalledWith(ANAS_EMPLOYEE.id, {
        name: 'Ana María',
      });
      expect(res.body).toEqual({
        id: ANAS_EMPLOYEE.id,
        name: 'Ana María',
        email: ANAS_EMPLOYEE.email,
      });
    });

    it('answers 403 for a session that is not the Dueño', async () => {
      scriptOtherSession(t);

      await t.http
        .patch(`/employees/${ANAS_EMPLOYEE.id}`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ name: 'Ana María' })
        .expect(403);
      expect(t.employees.update).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Employee', async () => {
      t.employees.findById.mockResolvedValue(null);

      await t.http
        .patch('/employees/999')
        .set(bearer(CLERK_TOKEN))
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
          .set(bearer(CLERK_TOKEN))
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
        .set(bearer(CLERK_TOKEN))
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
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual({ cancelledBookings: 5 });
    });

    it("answers 422 and changes nothing when they're the last Empleado of a Servicio not dado de baja", async () => {
      t.services.listActiveByEmployee.mockResolvedValue([
        {
          id: 1,
          branchId: 1,
          name: 'Haircut',
          description: null,
          category: ServiceCategory.SPA,
          durationMinutes: 30,
          price: 20,
          retiredAt: null,
          employees: [{ id: ANAS_EMPLOYEE.id, name: ANAS_EMPLOYEE.name }],
        },
      ]);

      await t.http
        .delete(`/employees/${ANAS_EMPLOYEE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(422);

      expect(t.employees.retire).not.toHaveBeenCalled();
    });

    it('gives them de baja when other Servicios have another Empleado', async () => {
      t.services.listActiveByEmployee.mockResolvedValue([
        {
          id: 1,
          branchId: 1,
          name: 'Haircut',
          description: null,
          category: ServiceCategory.SPA,
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
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.employees.retire).toHaveBeenCalled();
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.delete(`/employees/${ANAS_EMPLOYEE.id}`).expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .delete(`/employees/${ANAS_EMPLOYEE.id}`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);

      expect(t.employees.retire).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Empleado', async () => {
      t.employees.findById.mockResolvedValue(null);

      await t.http.delete('/employees/999').set(bearer(CLERK_TOKEN)).expect(404);
    });
  });

  describe('GET /businesses/:id/employees', () => {
    beforeEach(() => {
      scriptSession(t);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    });

    it('lists the Business Employees not dados de baja as { id, name, email }', async () => {
      t.employees.listActiveByBusiness.mockResolvedValue([
        ANAS_EMPLOYEE,
        OTHER_EMPLOYEE,
      ]);

      const res = await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual([
        {
          id: ANAS_EMPLOYEE.id,
          name: ANAS_EMPLOYEE.name,
          email: ANAS_EMPLOYEE.email,
        },
        {
          id: OTHER_EMPLOYEE.id,
          name: OTHER_EMPLOYEE.name,
          email: OTHER_EMPLOYEE.email,
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
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);
    });

    it('answers 404 for an unknown Business', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await t.http
        .get('/businesses/999/employees')
        .set(bearer(CLERK_TOKEN))
        .expect(404);
    });
  });

  it('answers a database failure with a generic 500', async () => {
    scriptSession(t);
    t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    t.users.findById.mockResolvedValue(ANA);
    t.clerkAuth.inviteToOrganization.mockRejectedValue(
      new DatabaseOperationError('Database operation failed', {
        cause: new Error('connection refused at 10.0.0.1'),
      }),
    );

    const res = await t.http
      .post(`/businesses/${ANAS_BUSINESS.id}/employees`)
      .set(bearer(CLERK_TOKEN))
      .send({ email: 'bruno@example.com' })
      .expect(500);

    expect(res.body).toEqual({
      statusCode: 500,
      message: 'Database operation failed',
    });
  });
});
