import { ConflictError } from '../../domain/errors';
import {
  ANAS_BUSINESS,
  bearer,
  createTestApp,
  OTHER_SESSION_ID,
  scriptOtherSession,
  scriptSession,
  SESSION_ID,
  TestApp,
} from '../../test-app';

const VALID_SERVICE = {
  name: 'Haircut',
  description: 'A basic haircut',
  durationMinutes: 30,
  price: 20,
};

const SERVICE = {
  id: 1,
  businessId: ANAS_BUSINESS.id,
  ...VALID_SERVICE,
  retiredAt: null,
};

describe('Servicio', () => {
  let t: TestApp;

  beforeEach(async () => (t = await createTestApp()));
  afterEach(() => t.app.close());

  describe('POST /businesses/:id/services', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    });

    it('creates a Servicio, for the Dueño', async () => {
      t.services.create.mockResolvedValue(SERVICE);

      const res = await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/services`)
        .set(bearer(SESSION_ID))
        .send(VALID_SERVICE)
        .expect(201);

      expect(t.services.create).toHaveBeenCalledWith({
        businessId: ANAS_BUSINESS.id,
        ...VALID_SERVICE,
      });
      expect(res.body).toEqual({
        id: SERVICE.id,
        businessId: SERVICE.businessId,
        name: SERVICE.name,
        description: SERVICE.description,
        durationMinutes: SERVICE.durationMinutes,
        price: SERVICE.price,
      });
    });

    it('creates a Servicio without a description', async () => {
      t.services.create.mockResolvedValue({ ...SERVICE, description: null });

      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/services`)
        .set(bearer(SESSION_ID))
        .send({ ...VALID_SERVICE, description: undefined })
        .expect(201);

      expect(t.services.create).toHaveBeenCalledWith({
        businessId: ANAS_BUSINESS.id,
        name: VALID_SERVICE.name,
        description: null,
        durationMinutes: VALID_SERVICE.durationMinutes,
        price: VALID_SERVICE.price,
      });
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/services`)
        .send(VALID_SERVICE)
        .expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/services`)
        .set(bearer(OTHER_SESSION_ID))
        .send(VALID_SERVICE)
        .expect(403);

      expect(t.services.create).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Negocio', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await t.http
        .post('/businesses/999/services')
        .set(bearer(SESSION_ID))
        .send(VALID_SERVICE)
        .expect(404);
    });

    it('answers 409 when the name is already used by an active Servicio', async () => {
      t.services.create.mockRejectedValue(
        new ConflictError('Service name already in use'),
      );

      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/services`)
        .set(bearer(SESSION_ID))
        .send(VALID_SERVICE)
        .expect(409);
    });

    it.each([
      ['a blank name', { name: ' ' }],
      ['a missing name', { name: undefined }],
      ['a fractional durationMinutes', { durationMinutes: 1.5 }],
      ['a zero durationMinutes', { durationMinutes: 0 }],
      ['a missing durationMinutes', { durationMinutes: undefined }],
      ['a negative price', { price: -1 }],
      ['a missing price', { price: undefined }],
    ])('rejects %s with 400, without reaching the repository', async (_, override) => {
      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/services`)
        .set(bearer(SESSION_ID))
        .send({ ...VALID_SERVICE, ...override })
        .expect(400);

      expect(t.services.create).not.toHaveBeenCalled();
    });

    it('accepts a zero price', async () => {
      t.services.create.mockResolvedValue({ ...SERVICE, price: 0 });

      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/services`)
        .set(bearer(SESSION_ID))
        .send({ ...VALID_SERVICE, price: 0 })
        .expect(201);
    });
  });

  describe('PATCH /services/:id', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.services.findById.mockResolvedValue(SERVICE);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    });

    it('edits a Servicio, for the Dueño', async () => {
      t.services.update.mockResolvedValue({ ...SERVICE, price: 25 });

      const res = await t.http
        .patch(`/services/${SERVICE.id}`)
        .set(bearer(SESSION_ID))
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
        .set(bearer(OTHER_SESSION_ID))
        .send({ price: 25 })
        .expect(403);

      expect(t.services.update).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Servicio', async () => {
      t.services.findById.mockResolvedValue(null);

      await t.http
        .patch('/services/999')
        .set(bearer(SESSION_ID))
        .send({ price: 25 })
        .expect(404);
    });

    it('answers 409 on a rename to a taken name', async () => {
      t.services.update.mockRejectedValue(
        new ConflictError('Service name already in use'),
      );

      await t.http
        .patch(`/services/${SERVICE.id}`)
        .set(bearer(SESSION_ID))
        .send({ name: 'Taken' })
        .expect(409);
    });

    it.each([
      ['a blank name', { name: ' ' }],
      ['a zero durationMinutes', { durationMinutes: 0 }],
      ['a negative price', { price: -1 }],
    ])('rejects %s with 400, without reaching the repository', async (_, body) => {
      await t.http
        .patch(`/services/${SERVICE.id}`)
        .set(bearer(SESSION_ID))
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
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.services.retire.mockResolvedValue({
        ...SERVICE,
        retiredAt: new Date(),
      });
    });

    it('gives the Servicio de baja, for the Dueño', async () => {
      const res = await t.http
        .delete(`/services/${SERVICE.id}`)
        .set(bearer(SESSION_ID))
        .expect(200);

      expect(t.services.retire).toHaveBeenCalledWith(SERVICE.id, expect.any(Date));
      expect(res.body).toEqual({ id: SERVICE.id, cancelledBookings: 0 });
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.delete(`/services/${SERVICE.id}`).expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .delete(`/services/${SERVICE.id}`)
        .set(bearer(OTHER_SESSION_ID))
        .expect(403);

      expect(t.services.retire).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Servicio', async () => {
      t.services.findById.mockResolvedValue(null);

      await t.http.delete('/services/999').set(bearer(SESSION_ID)).expect(404);
    });
  });

  describe('GET /businesses/:id/services', () => {
    it("lists a Negocio's active Servicios without a Sesión", async () => {
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.services.listActiveByBusiness.mockResolvedValue([SERVICE]);

      const res = await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}/services`)
        .expect(200);

      expect(res.body).toEqual([
        {
          id: SERVICE.id,
          businessId: SERVICE.businessId,
          name: SERVICE.name,
          description: SERVICE.description,
          durationMinutes: SERVICE.durationMinutes,
          price: SERVICE.price,
        },
      ]);
    });

    it('answers 404 for an unknown Negocio', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await t.http.get('/businesses/999/services').expect(404);
    });
  });
});
