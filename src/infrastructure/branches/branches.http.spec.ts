import {
  ANAS_BUSINESS,
  bearer,
  createTestApp,
  OTHER_CLERK_TOKEN,
  scriptOtherSession,
  scriptSession,
  CLERK_TOKEN,
  TestApp,
} from '../../test-app';

const VALID_BRANCH = {
  name: 'Downtown',
  address: '123 Main St',
  opensAt: '09:00',
  closesAt: '18:00',
};

const BRANCH = {
  id: 1,
  businessId: ANAS_BUSINESS.id,
  ...VALID_BRANCH,
};

describe('Sucursal', () => {
  let t: TestApp;

  beforeEach(async () => (t = await createTestApp()));
  afterEach(() => t.app.close());

  describe('POST /businesses/:id/branches', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    });

    it('creates a Sucursal, for the Dueño', async () => {
      t.branches.create.mockResolvedValue(BRANCH);

      const res = await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/branches`)
        .set(bearer(CLERK_TOKEN))
        .send(VALID_BRANCH)
        .expect(201);

      expect(t.branches.create).toHaveBeenCalledWith({
        businessId: ANAS_BUSINESS.id,
        ...VALID_BRANCH,
      });
      expect(res.body).toEqual(BRANCH);
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/branches`)
        .send(VALID_BRANCH)
        .expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/branches`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send(VALID_BRANCH)
        .expect(403);

      expect(t.branches.create).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Negocio', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await t.http
        .post('/businesses/999/branches')
        .set(bearer(CLERK_TOKEN))
        .send(VALID_BRANCH)
        .expect(404);
    });

    it.each([
      ['a blank name', { name: ' ' }],
      ['a missing name', { name: undefined }],
      ['a blank address', { address: ' ' }],
      ['a missing address', { address: undefined }],
      ['a malformed opensAt', { opensAt: '9:00' }],
      ['a malformed closesAt', { closesAt: '18:60' }],
      ['a missing opensAt', { opensAt: undefined }],
      ['a missing closesAt', { closesAt: undefined }],
    ])('rejects %s with 400, without reaching the repository', async (_, override) => {
      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/branches`)
        .set(bearer(CLERK_TOKEN))
        .send({ ...VALID_BRANCH, ...override })
        .expect(400);

      expect(t.branches.create).not.toHaveBeenCalled();
    });

    it('answers 422 when closesAt is not after opensAt', async () => {
      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/branches`)
        .set(bearer(CLERK_TOKEN))
        .send({ ...VALID_BRANCH, opensAt: '18:00', closesAt: '09:00' })
        .expect(422);

      expect(t.branches.create).not.toHaveBeenCalled();
    });

    it('answers 422 when closesAt equals opensAt', async () => {
      await t.http
        .post(`/businesses/${ANAS_BUSINESS.id}/branches`)
        .set(bearer(CLERK_TOKEN))
        .send({ ...VALID_BRANCH, opensAt: '09:00', closesAt: '09:00' })
        .expect(422);
    });
  });

  describe('PATCH /branches/:id', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.branches.findById.mockResolvedValue(BRANCH);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    });

    it('edits name, address and hours, for the Dueño of its Negocio', async () => {
      t.branches.update.mockResolvedValue({ ...BRANCH, name: 'New name' });

      const res = await t.http
        .patch(`/branches/${BRANCH.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ name: 'New name' })
        .expect(200);

      expect(t.branches.update).toHaveBeenCalledWith(BRANCH.id, {
        name: 'New name',
      });
      expect(res.body.name).toBe('New name');
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .patch(`/branches/${BRANCH.id}`)
        .send({ name: 'New name' })
        .expect(401);
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .patch(`/branches/${BRANCH.id}`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ name: 'New name' })
        .expect(403);

      expect(t.branches.update).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Sucursal', async () => {
      t.branches.findById.mockResolvedValue(null);

      await t.http
        .patch('/branches/999')
        .set(bearer(CLERK_TOKEN))
        .send({ name: 'New name' })
        .expect(404);
    });

    it.each([
      ['a blank name', { name: ' ' }],
      ['a malformed opensAt', { opensAt: '25:00' }],
      ['a malformed closesAt', { closesAt: 'noon' }],
    ])('rejects %s with 400, without reaching the repository', async (_, body) => {
      await t.http
        .patch(`/branches/${BRANCH.id}`)
        .set(bearer(CLERK_TOKEN))
        .send(body)
        .expect(400);

      expect(t.branches.update).not.toHaveBeenCalled();
    });

    it('answers 422 when editing only opensAt crosses the existing closesAt', async () => {
      await t.http
        .patch(`/branches/${BRANCH.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ opensAt: '19:00' })
        .expect(422);

      expect(t.branches.update).not.toHaveBeenCalled();
    });

    it('validates the merge of new and existing hours when both are edited', async () => {
      t.branches.update.mockResolvedValue({
        ...BRANCH,
        opensAt: '10:00',
        closesAt: '20:00',
      });

      await t.http
        .patch(`/branches/${BRANCH.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ opensAt: '10:00', closesAt: '20:00' })
        .expect(200);
    });
  });

  describe('GET /businesses/:id/branches', () => {
    it('lists a Negocio\'s Sucursales without a Sesión', async () => {
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
      t.branches.listByBusiness.mockResolvedValue([BRANCH]);

      const res = await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}/branches`)
        .expect(200);

      expect(res.body).toEqual([BRANCH]);
    });

    it('answers 404 for an unknown Negocio', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await t.http.get('/businesses/999/branches').expect(404);
    });
  });
});
