import { ConflictError } from '../../domain/errors';
import { ServiceCategory } from '../../domain/services/service';
import {
  ANAS_BRANCH,
  ANAS_BUSINESS,
  ANAS_EMPLOYEE,
  bearer,
  createTestApp,
  DAY_MS,
  OTHER_CLERK_TOKEN,
  scriptOtherSession,
  scriptSession,
  CLERK_TOKEN,
  TestApp,
} from '../../test-app';

const BRANCH = ANAS_BRANCH;

/** A second Empleado of Ana's. */
const OTHER_EMPLOYEE = {
  ...ANAS_EMPLOYEE,
  id: 2,
  name: 'Bruno Díaz',
  email: 'bruno@example.com',
};

const IN_CHARGE = [{ id: ANAS_EMPLOYEE.id, name: ANAS_EMPLOYEE.name }];

const VALID_SERVICE = {
  name: 'Haircut',
  description: 'A basic haircut',
  category: ServiceCategory.SPA,
  durationMinutes: 30,
  price: 20,
  employeeIds: [ANAS_EMPLOYEE.id],
};

const SERVICE = {
  id: 1,
  branchId: BRANCH.id,
  name: VALID_SERVICE.name,
  description: VALID_SERVICE.description,
  category: VALID_SERVICE.category,
  durationMinutes: VALID_SERVICE.durationMinutes,
  price: VALID_SERVICE.price,
  retiredAt: null,
  employees: IN_CHARGE,
};

const PRESENTED_SERVICE = {
  id: SERVICE.id,
  branchId: SERVICE.branchId,
  name: SERVICE.name,
  description: SERVICE.description,
  category: SERVICE.category,
  durationMinutes: SERVICE.durationMinutes,
  price: SERVICE.price,
  employees: IN_CHARGE,
};

describe('Servicio', () => {
  let t: TestApp;

  beforeEach(async () => (t = await createTestApp()));
  afterEach(() => t.app.close());

  describe('POST /branches/:id/services', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.branches.findById.mockResolvedValue(BRANCH);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.employees.listByIds.mockResolvedValue([ANAS_EMPLOYEE]);
    });

    it('creates a Servicio, for the Dueño', async () => {
      t.services.create.mockResolvedValue(SERVICE);

      const res = await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send(VALID_SERVICE)
        .expect(201);

      expect(t.services.create).toHaveBeenCalledWith({
        branchId: BRANCH.id,
        ...VALID_SERVICE,
      });
      expect(res.body).toEqual(PRESENTED_SERVICE);
    });

    it('creates a Servicio without a description', async () => {
      t.services.create.mockResolvedValue({ ...SERVICE, description: null });

      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send({ ...VALID_SERVICE, description: undefined })
        .expect(201);

      expect(t.services.create).toHaveBeenCalledWith({
        branchId: BRANCH.id,
        name: VALID_SERVICE.name,
        description: null,
        category: VALID_SERVICE.category,
        durationMinutes: VALID_SERVICE.durationMinutes,
        price: VALID_SERVICE.price,
        employeeIds: VALID_SERVICE.employeeIds,
      });
    });

    it('puts several Empleados in charge', async () => {
      t.employees.listByIds.mockResolvedValue([ANAS_EMPLOYEE, OTHER_EMPLOYEE]);
      t.services.create.mockResolvedValue(SERVICE);

      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send({
          ...VALID_SERVICE,
          employeeIds: [ANAS_EMPLOYEE.id, OTHER_EMPLOYEE.id],
        })
        .expect(201);

      expect(t.services.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeIds: [ANAS_EMPLOYEE.id, OTHER_EMPLOYEE.id],
        }),
      );
    });

    it('answers 422 for an Empleado of another Negocio', async () => {
      t.employees.listByIds.mockResolvedValue([
        { ...ANAS_EMPLOYEE, businessId: ANAS_BUSINESS.id + 1 },
      ]);

      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send(VALID_SERVICE)
        .expect(422);

      expect(t.services.create).not.toHaveBeenCalled();
    });

    it('answers 422 for an Empleado dado de baja', async () => {
      t.employees.listByIds.mockResolvedValue([
        { ...ANAS_EMPLOYEE, retiredAt: new Date('2026-01-01T00:00:00.000Z') },
      ]);

      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send(VALID_SERVICE)
        .expect(422);

      expect(t.services.create).not.toHaveBeenCalled();
    });

    it('answers 422 for an unknown employeeId', async () => {
      t.employees.listByIds.mockResolvedValue([]);

      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send({ ...VALID_SERVICE, employeeIds: [999] })
        .expect(422);

      expect(t.services.create).not.toHaveBeenCalled();
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .send(VALID_SERVICE)
        .expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send(VALID_SERVICE)
        .expect(403);

      expect(t.services.create).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Sucursal', async () => {
      t.branches.findById.mockResolvedValue(null);

      await t.http
        .post('/branches/999/services')
        .set(bearer(CLERK_TOKEN))
        .send(VALID_SERVICE)
        .expect(404);
    });

    it('answers 409 when the name is already used by an active Servicio in the same Sucursal', async () => {
      t.services.create.mockRejectedValue(
        new ConflictError('Service name already in use'),
      );

      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send(VALID_SERVICE)
        .expect(409);
    });

    it.each([
      ['a blank name', { name: ' ' }],
      ['a missing name', { name: undefined }],
      ['an invalid category', { category: 'NOT_A_CATEGORY' }],
      ['a missing category', { category: undefined }],
      ['a fractional durationMinutes', { durationMinutes: 1.5 }],
      ['a zero durationMinutes', { durationMinutes: 0 }],
      ['a missing durationMinutes', { durationMinutes: undefined }],
      ['a negative price', { price: -1 }],
      ['a missing price', { price: undefined }],
      ['missing employeeIds', { employeeIds: undefined }],
      ['empty employeeIds', { employeeIds: [] }],
      ['a non-numeric employeeId', { employeeIds: ['one'] }],
    ])('rejects %s with 400, without reaching the repository', async (_, override) => {
      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send({ ...VALID_SERVICE, ...override })
        .expect(400);

      expect(t.services.create).not.toHaveBeenCalled();
    });

    it('accepts a zero price', async () => {
      t.services.create.mockResolvedValue({ ...SERVICE, price: 0 });

      await t.http
        .post(`/branches/${BRANCH.id}/services`)
        .set(bearer(CLERK_TOKEN))
        .send({ ...VALID_SERVICE, price: 0 })
        .expect(201);
    });
  });

  describe('PATCH /services/:id', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.services.findById.mockResolvedValue(SERVICE);
      t.branches.findById.mockResolvedValue(BRANCH);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    });

    it('edits a Servicio, for the Dueño', async () => {
      t.services.update.mockResolvedValue({ ...SERVICE, price: 25 });

      const res = await t.http
        .patch(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ price: 25 })
        .expect(200);

      expect(t.services.update).toHaveBeenCalledWith(SERVICE.id, {
        price: 25,
      });
      expect(res.body.price).toBe(25);
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .patch(`/services/${SERVICE.id}`)
        .send({ price: 25 })
        .expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .patch(`/services/${SERVICE.id}`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ price: 25 })
        .expect(403);

      expect(t.services.update).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Servicio', async () => {
      t.services.findById.mockResolvedValue(null);

      await t.http
        .patch('/services/999')
        .set(bearer(CLERK_TOKEN))
        .send({ price: 25 })
        .expect(404);
    });

    it('answers 409 on a rename to a taken name', async () => {
      t.services.update.mockRejectedValue(
        new ConflictError('Service name already in use'),
      );

      await t.http
        .patch(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ name: 'Taken' })
        .expect(409);
    });

    it.each([
      ['a blank name', { name: ' ' }],
      ['an invalid category', { category: 'NOT_A_CATEGORY' }],
      ['a zero durationMinutes', { durationMinutes: 0 }],
      ['a negative price', { price: -1 }],
    ])('rejects %s with 400, without reaching the repository', async (_, body) => {
      await t.http
        .patch(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .send(body)
        .expect(400);

      expect(t.services.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /services/:id', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.services.findById.mockResolvedValue(SERVICE);
      t.branches.findById.mockResolvedValue(BRANCH);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.services.retire.mockResolvedValue({
        service: { ...SERVICE, retiredAt: new Date() },
        cancelledBookings: 0,
      });
    });

    it('gives the Servicio de baja, for the Dueño', async () => {
      const res = await t.http
        .delete(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.services.retire).toHaveBeenCalledWith(SERVICE.id, expect.any(Date));
      expect(res.body).toEqual({ id: SERVICE.id, cancelledBookings: 0 });
    });

    it("uses the Clock's current now as the cascade's cutoff, moving as the Clock advances", async () => {
      t.clock.advance(2 * DAY_MS);

      await t.http
        .delete(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.services.retire).toHaveBeenCalledWith(SERVICE.id, t.clock.now());
    });

    it('reports how many future Turnos it cancelled', async () => {
      t.services.retire.mockResolvedValue({
        service: { ...SERVICE, retiredAt: new Date() },
        cancelledBookings: 3,
      });

      const res = await t.http
        .delete(`/services/${SERVICE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual({ id: SERVICE.id, cancelledBookings: 3 });
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.delete(`/services/${SERVICE.id}`).expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .delete(`/services/${SERVICE.id}`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);

      expect(t.services.retire).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Servicio', async () => {
      t.services.findById.mockResolvedValue(null);

      await t.http.delete('/services/999').set(bearer(CLERK_TOKEN)).expect(404);
    });
  });

  describe('POST /services/:id/employees', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.services.findById.mockResolvedValue(SERVICE);
      t.branches.findById.mockResolvedValue(BRANCH);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.employees.findById.mockResolvedValue(OTHER_EMPLOYEE);
    });

    it('puts the Empleado in charge of the Servicio, for the Dueño', async () => {
      t.services.addEmployee.mockResolvedValue({
        ...SERVICE,
        employees: [...IN_CHARGE, { id: OTHER_EMPLOYEE.id, name: OTHER_EMPLOYEE.name }],
      });

      const res = await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id })
        .expect(201);

      expect(t.services.addEmployee).toHaveBeenCalledWith(
        SERVICE.id,
        OTHER_EMPLOYEE.id,
      );
      expect(res.body.employees).toContainEqual({
        id: OTHER_EMPLOYEE.id,
        name: OTHER_EMPLOYEE.name,
      });
    });

    it('answers 409 when the Empleado is already in charge', async () => {
      t.services.addEmployee.mockRejectedValue(
        new ConflictError('Employee already in charge of this Service'),
      );

      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id })
        .expect(409);
    });

    it('answers 422 for an Empleado of another Negocio', async () => {
      t.employees.findById.mockResolvedValue({
        ...OTHER_EMPLOYEE,
        businessId: ANAS_BUSINESS.id + 1,
      });

      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id })
        .expect(422);

      expect(t.services.addEmployee).not.toHaveBeenCalled();
    });

    it('answers 422 for an Empleado dado de baja', async () => {
      t.employees.findById.mockResolvedValue({
        ...OTHER_EMPLOYEE,
        retiredAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id })
        .expect(422);

      expect(t.services.addEmployee).not.toHaveBeenCalled();
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .send({ employeeId: OTHER_EMPLOYEE.id })
        .expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id })
        .expect(403);

      expect(t.services.addEmployee).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Servicio', async () => {
      t.services.findById.mockResolvedValue(null);

      await t.http
        .post('/services/999/employees')
        .set(bearer(CLERK_TOKEN))
        .send({ employeeId: OTHER_EMPLOYEE.id })
        .expect(404);
    });

    it('answers 404 for an unknown Empleado', async () => {
      t.employees.findById.mockResolvedValue(null);

      await t.http
        .post(`/services/${SERVICE.id}/employees`)
        .set(bearer(CLERK_TOKEN))
        .send({ employeeId: 999 })
        .expect(404);

      expect(t.services.addEmployee).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /services/:id/employees/:employeeId', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.services.findById.mockResolvedValue(SERVICE);
      t.branches.findById.mockResolvedValue(BRANCH);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.employees.findById.mockResolvedValue(OTHER_EMPLOYEE);
      t.services.removeEmployee.mockResolvedValue({
        service: SERVICE,
        cancelledBookings: 0,
      });
    });

    it('takes the Empleado off the Servicio, for the Dueño', async () => {
      const res = await t.http
        .delete(`/services/${SERVICE.id}/employees/${OTHER_EMPLOYEE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.services.removeEmployee).toHaveBeenCalledWith(
        SERVICE.id,
        OTHER_EMPLOYEE.id,
        expect.any(Date),
      );
      expect(res.body).toEqual({ cancelledBookings: 0 });
    });

    it('reports how many future Turnos of that Empleado it cancelled', async () => {
      t.services.removeEmployee.mockResolvedValue({
        service: SERVICE,
        cancelledBookings: 2,
      });

      const res = await t.http
        .delete(`/services/${SERVICE.id}/employees/${OTHER_EMPLOYEE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual({ cancelledBookings: 2 });
    });

    it("answers 422 and changes nothing when they're the Servicio's last Empleado", async () => {
      t.employees.findById.mockResolvedValue(ANAS_EMPLOYEE);

      await t.http
        .delete(`/services/${SERVICE.id}/employees/${ANAS_EMPLOYEE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(422);

      expect(t.services.removeEmployee).not.toHaveBeenCalled();
    });

    it('removes the last Empleado when the Servicio is already dado de baja', async () => {
      t.employees.findById.mockResolvedValue(ANAS_EMPLOYEE);
      t.services.findById.mockResolvedValue({
        ...SERVICE,
        retiredAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await t.http
        .delete(`/services/${SERVICE.id}/employees/${ANAS_EMPLOYEE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.services.removeEmployee).toHaveBeenCalledWith(
        SERVICE.id,
        ANAS_EMPLOYEE.id,
        expect.any(Date),
      );
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .delete(`/services/${SERVICE.id}/employees/${OTHER_EMPLOYEE.id}`)
        .expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .delete(`/services/${SERVICE.id}/employees/${OTHER_EMPLOYEE.id}`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);

      expect(t.services.removeEmployee).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Servicio', async () => {
      t.services.findById.mockResolvedValue(null);

      await t.http
        .delete(`/services/999/employees/${OTHER_EMPLOYEE.id}`)
        .set(bearer(CLERK_TOKEN))
        .expect(404);
    });

    it('answers 404 for an unknown Empleado', async () => {
      t.employees.findById.mockResolvedValue(null);

      await t.http
        .delete(`/services/${SERVICE.id}/employees/999`)
        .set(bearer(CLERK_TOKEN))
        .expect(404);

      expect(t.services.removeEmployee).not.toHaveBeenCalled();
    });
  });

  describe('GET /branches/:id/services', () => {
    it("lists a Sucursal's active Servicios, and who attends each, without a Sesión", async () => {
      t.branches.findById.mockResolvedValue(BRANCH);
      t.services.listActiveByBranch.mockResolvedValue([SERVICE]);

      const res = await t.http
        .get(`/branches/${BRANCH.id}/services`)
        .expect(200);

      expect(res.body).toEqual([PRESENTED_SERVICE]);
      expect(JSON.stringify(res.body)).not.toContain(ANAS_EMPLOYEE.email);
    });

    it('answers 404 for an unknown Sucursal', async () => {
      t.branches.findById.mockResolvedValue(null);

      await t.http.get('/branches/999/services').expect(404);
    });
  });
});
