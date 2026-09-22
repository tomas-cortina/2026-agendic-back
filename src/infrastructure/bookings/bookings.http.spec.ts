import { Booking, BookingStatus } from '../../domain/bookings/booking';
import { BusinessRuleError, ConflictError } from '../../domain/errors';
import {
  ANAS_BRANCH,
  ANAS_BUSINESS,
  ANAS_EMPLOYEE,
  ANAS_SERVICE,
  bearer,
  createTestApp,
  OTHER_CLERK_TOKEN,
  scriptOtherSession,
  scriptSession,
  CLERK_TOKEN,
  TestApp,
} from '../../test-app';

const BRANCH = ANAS_BRANCH;
const SERVICE = ANAS_SERVICE;

const VALID_BOOKING = {
  serviceId: SERVICE.id,
  employeeId: ANAS_EMPLOYEE.id,
  startsAt: '2026-01-01T12:00:00.000Z', // 09:00 in America/Argentina/Buenos_Aires: opening time
  clientName: 'Bruno Díaz',
  clientEmail: 'bruno@example.com',
};

const BOOKING: Booking = {
  id: 1,
  serviceId: SERVICE.id,
  employeeId: ANAS_EMPLOYEE.id,
  clientName: VALID_BOOKING.clientName,
  clientEmail: VALID_BOOKING.clientEmail,
  startsAt: new Date(VALID_BOOKING.startsAt),
  endsAt: new Date('2026-01-01T12:30:00.000Z'),
  status: BookingStatus.UNVERIFIED,
};

describe('Turno', () => {
  let t: TestApp;

  beforeEach(async () => (t = await createTestApp()));
  afterEach(() => t.app.close());

  describe('POST /bookings', () => {
    beforeEach(() => {
      t.services.findById.mockResolvedValue(SERVICE);
      t.branches.findById.mockResolvedValue(BRANCH);
      t.bookings.hasOverlappingBooked.mockResolvedValue(false);
      t.bookings.create.mockResolvedValue({ booking: BOOKING, token: 'a-token' });
    });

    it('books a Turno as UNVERIFIED, without a Sesión, and sends a verification link', async () => {
      const res = await t.http.post('/bookings').send(VALID_BOOKING).expect(201);

      expect(res.body).toEqual({
        id: BOOKING.id,
        serviceId: BOOKING.serviceId,
        employeeId: BOOKING.employeeId,
        startsAt: BOOKING.startsAt.toISOString(),
        endsAt: BOOKING.endsAt.toISOString(),
        status: 'UNVERIFIED',
      });
      expect(t.bookings.create).toHaveBeenCalledWith(
        {
          serviceId: SERVICE.id,
          employeeId: ANAS_EMPLOYEE.id,
          clientName: VALID_BOOKING.clientName,
          clientEmail: VALID_BOOKING.clientEmail,
          startsAt: new Date(VALID_BOOKING.startsAt),
          endsAt: new Date('2026-01-01T12:30:00.000Z'),
        },
        new Date('2026-01-02T12:00:00.000Z'),
      );
      expect(t.mailer.sendVerificationLink).toHaveBeenCalledWith(
        VALID_BOOKING.clientEmail,
        'a-token',
      );
    });

    it('trims the name and trims and lowercases the email', async () => {
      await t.http
        .post('/bookings')
        .send({
          ...VALID_BOOKING,
          clientName: '  Bruno  ',
          clientEmail: '  Bruno@Example.COM ',
        })
        .expect(201);

      expect(t.bookings.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clientName: 'Bruno',
          clientEmail: 'bruno@example.com',
        }),
        expect.any(Date),
      );
    });

    it('accepts a Turno ending exactly at closing time', async () => {
      await t.http
        .post('/bookings')
        .send({ ...VALID_BOOKING, startsAt: '2026-01-01T20:30:00.000Z' }) // 17:30 ARG, ends 18:00 ARG
        .expect(201);
    });

    it('answers 422 for a Turno starting before now', async () => {
      await t.http
        .post('/bookings')
        .send({ ...VALID_BOOKING, startsAt: '2026-01-01T11:59:59.000Z' })
        .expect(422);

      expect(t.bookings.create).not.toHaveBeenCalled();
    });

    it('answers 422 for a Turno starting before the Sucursal opens', async () => {
      await t.http
        .post('/bookings')
        .send({ ...VALID_BOOKING, startsAt: '2026-01-02T10:00:00.000Z' }) // 07:00 ARG, after now but before opening
        .expect(422);

      expect(t.bookings.create).not.toHaveBeenCalled();
    });

    it('answers 422 for a Turno ending after the Sucursal closes', async () => {
      await t.http
        .post('/bookings')
        .send({ ...VALID_BOOKING, startsAt: '2026-01-01T20:45:00.000Z' }) // 17:45 ARG, ends 18:15 ARG
        .expect(422);

      expect(t.bookings.create).not.toHaveBeenCalled();
    });

    it('answers 422 for an unknown Servicio', async () => {
      t.services.findById.mockResolvedValue(null);

      await t.http.post('/bookings').send(VALID_BOOKING).expect(422);
      expect(t.bookings.create).not.toHaveBeenCalled();
    });

    it('answers 422 for a Servicio dado de baja', async () => {
      t.services.findById.mockResolvedValue({
        ...SERVICE,
        retiredAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await t.http.post('/bookings').send(VALID_BOOKING).expect(422);
      expect(t.bookings.create).not.toHaveBeenCalled();
    });

    it('answers 422 for an Empleado not in charge of the Servicio', async () => {
      await t.http
        .post('/bookings')
        .send({ ...VALID_BOOKING, employeeId: ANAS_EMPLOYEE.id + 1 })
        .expect(422);

      expect(t.bookings.create).not.toHaveBeenCalled();
    });

    it('answers 409 when the slot overlaps a BOOKED Turno of the same Empleado', async () => {
      t.bookings.hasOverlappingBooked.mockResolvedValue(true);

      await t.http.post('/bookings').send(VALID_BOOKING).expect(409);
      expect(t.bookings.create).not.toHaveBeenCalled();
    });

    it("doesn't hold the slot: two Turnos sin verificar for the same Empleado and time can both be created", async () => {
      await t.http.post('/bookings').send(VALID_BOOKING).expect(201);
      await t.http
        .post('/bookings')
        .send({ ...VALID_BOOKING, clientEmail: 'other@example.com' })
        .expect(201);

      expect(t.bookings.create).toHaveBeenCalledTimes(2);
    });

    it.each([
      ['a blank clientName', { clientName: ' ' }],
      ['a missing clientName', { clientName: undefined }],
      ['a malformed clientEmail', { clientEmail: 'bruno@' }],
      ['a missing clientEmail', { clientEmail: undefined }],
      ['a malformed startsAt', { startsAt: 'not-a-date' }],
      ['a missing startsAt', { startsAt: undefined }],
      ['a missing serviceId', { serviceId: undefined }],
      ['a missing employeeId', { employeeId: undefined }],
    ])('rejects %s with 400, without reaching the repository', async (_, override) => {
      await t.http
        .post('/bookings')
        .send({ ...VALID_BOOKING, ...override })
        .expect(400);

      expect(t.bookings.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /bookings/verification', () => {
    beforeEach(() => {
      t.bookings.findByVerificationToken.mockResolvedValue(BOOKING);
      t.services.findById.mockResolvedValue(SERVICE);
      t.branches.findById.mockResolvedValue(BRANCH);
      t.bookings.markBooked.mockResolvedValue({
        ...BOOKING,
        status: BookingStatus.BOOKED,
      });
    });

    it('books the Turno for real when every rule still holds', async () => {
      const res = await t.http
        .post('/bookings/verification')
        .send({ token: 'a-token' })
        .expect(201);

      expect(t.bookings.markBooked).toHaveBeenCalledWith(BOOKING.id);
      expect(res.body).toMatchObject({ id: BOOKING.id, status: 'BOOKED' });
    });

    it('answers 422 for an unknown, used or expired token', async () => {
      t.bookings.findByVerificationToken.mockRejectedValue(
        new BusinessRuleError('Unknown, used or expired verification token'),
      );

      await t.http
        .post('/bookings/verification')
        .send({ token: 'stale-token' })
        .expect(422);
      expect(t.bookings.markBooked).not.toHaveBeenCalled();
    });

    it('answers 422 when the Servicio was dado de baja meanwhile', async () => {
      t.services.findById.mockResolvedValue({
        ...SERVICE,
        retiredAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await t.http
        .post('/bookings/verification')
        .send({ token: 'a-token' })
        .expect(422);
      expect(t.bookings.markBooked).not.toHaveBeenCalled();
    });

    it('answers 422 when the Empleado was taken off the Servicio or dado de baja meanwhile', async () => {
      t.services.findById.mockResolvedValue({ ...SERVICE, employees: [] });

      await t.http
        .post('/bookings/verification')
        .send({ token: 'a-token' })
        .expect(422);
      expect(t.bookings.markBooked).not.toHaveBeenCalled();
    });

    it('answers 422 when the time is now past', async () => {
      t.clock.advance(2 * 24 * 60 * 60 * 1000);

      await t.http
        .post('/bookings/verification')
        .send({ token: 'a-token' })
        .expect(422);
      expect(t.bookings.markBooked).not.toHaveBeenCalled();
    });

    it('answers 409 when an overlapping Turno of the same Empleado was verified first', async () => {
      t.bookings.markBooked.mockRejectedValue(
        new ConflictError('Overlaps a booked Turno for this Employee'),
      );

      await t.http
        .post('/bookings/verification')
        .send({ token: 'a-token' })
        .expect(409);
    });

    it('rejects a missing token with 400', async () => {
      await t.http.post('/bookings/verification').send({}).expect(400);
      expect(t.bookings.findByVerificationToken).not.toHaveBeenCalled();
    });
  });

  describe('GET /businesses/:id/bookings', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.bookings.listByBusiness.mockResolvedValue([BOOKING]);
    });

    it("lists every Turno of the Negocio, with the Cliente's name, email and status, for the Dueño", async () => {
      const res = await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}/bookings`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual([
        {
          id: BOOKING.id,
          serviceId: BOOKING.serviceId,
          employeeId: BOOKING.employeeId,
          startsAt: BOOKING.startsAt.toISOString(),
          endsAt: BOOKING.endsAt.toISOString(),
          status: BOOKING.status,
          clientName: BOOKING.clientName,
          clientEmail: BOOKING.clientEmail,
        },
      ]);
    });

    it('shows a cascaded Turno as CANCELLED', async () => {
      t.bookings.listByBusiness.mockResolvedValue([
        { ...BOOKING, status: BookingStatus.CANCELLED },
      ]);

      const res = await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}/bookings`)
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toMatchObject([{ status: 'CANCELLED' }]);
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.get(`/businesses/${ANAS_BUSINESS.id}/bookings`).expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}/bookings`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(403);
    });

    it('answers 404 for an unknown Negocio', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await t.http
        .get('/businesses/999/bookings')
        .set(bearer(CLERK_TOKEN))
        .expect(404);
    });
  });

  it('GET /me/bookings does not exist', async () => {
    scriptSession(t);

    await t.http.get('/me/bookings').set(bearer(CLERK_TOKEN)).expect(404);
  });
});
