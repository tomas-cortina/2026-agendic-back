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

describe('Negocio', () => {
  let t: TestApp;

  beforeEach(async () => (t = await createTestApp()));
  afterEach(() => t.app.close());

  describe('POST /businesses', () => {
    beforeEach(() => scriptSession(t));

    it("creates a Negocio owned by the current Usuario, given its name and description", async () => {
      t.businesses.create.mockResolvedValue(ANAS_BUSINESS);

      const res = await t.http
        .post('/businesses')
        .set(bearer(SESSION_ID))
        .send({ name: ANAS_BUSINESS.name, description: ANAS_BUSINESS.description })
        .expect(201);

      expect(t.businesses.create).toHaveBeenCalledWith({
        name: ANAS_BUSINESS.name,
        description: ANAS_BUSINESS.description,
        ownerId: ANAS_BUSINESS.ownerId,
      });
      expect(res.body).toEqual(ANAS_BUSINESS);
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .post('/businesses')
        .send({ name: 'x', description: 'y' })
        .expect(401);
    });

    it.each([
      ['a blank name', { name: '  ' }],
      ['a missing name', { name: undefined }],
      ['a blank description', { description: '  ' }],
      ['a missing description', { description: undefined }],
      ['an unknown field', { ownerId: 999 }],
    ])('rejects %s with 400, without reaching the repository', async (_, override) => {
      await t.http
        .post('/businesses')
        .set(bearer(SESSION_ID))
        .send({ name: 'x', description: 'y', ...override })
        .expect(400);

      expect(t.businesses.create).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /businesses/:id', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    });

    it('edits name and description, for the Dueño', async () => {
      t.businesses.update.mockResolvedValue({
        ...ANAS_BUSINESS,
        name: 'New name',
      });

      const res = await t.http
        .patch(`/businesses/${ANAS_BUSINESS.id}`)
        .set(bearer(SESSION_ID))
        .send({ name: 'New name' })
        .expect(200);

      expect(t.businesses.update).toHaveBeenCalledWith(ANAS_BUSINESS.id, {
        name: 'New name',
      });
      expect(res.body.name).toBe('New name');
    });

    it("answers 403 for another Usuario", async () => {
      await t.http
        .patch(`/businesses/${ANAS_BUSINESS.id}`)
        .set(bearer(OTHER_SESSION_ID))
        .send({ name: 'New name' })
        .expect(403);

      expect(t.businesses.update).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Negocio', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await t.http
        .patch('/businesses/999')
        .set(bearer(SESSION_ID))
        .send({ name: 'New name' })
        .expect(404);
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .patch(`/businesses/${ANAS_BUSINESS.id}`)
        .send({ name: 'New name' })
        .expect(401);
    });

    it.each([
      ['a blank name', { name: ' ' }],
      ['a null name', { name: null }],
      ['a blank description', { description: ' ' }],
      ['a null description', { description: null }],
    ])('rejects %s with 400, without reaching the repository', async (_, body) => {
      await t.http
        .patch(`/businesses/${ANAS_BUSINESS.id}`)
        .set(bearer(SESSION_ID))
        .send(body)
        .expect(400);

      expect(t.businesses.update).not.toHaveBeenCalled();
    });
  });

  describe('GET /businesses', () => {
    it('lists Negocios without a Sesión', async () => {
      t.businesses.list.mockResolvedValue([ANAS_BUSINESS]);

      const res = await t.http.get('/businesses').expect(200);

      expect(res.body).toEqual([ANAS_BUSINESS]);
    });
  });

  describe('GET /businesses/:id', () => {
    it('returns a Negocio without a Sesión', async () => {
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);

      const res = await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}`)
        .expect(200);

      expect(res.body).toEqual(ANAS_BUSINESS);
    });

    it('answers 404 for an unknown Negocio', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await t.http.get('/businesses/999').expect(404);
    });
  });
});
