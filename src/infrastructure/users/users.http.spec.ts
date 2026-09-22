import { DatabaseOperationError } from '../../domain/errors';
import {
  ANA,
  bearer,
  CLERK_TOKEN,
  createTestApp,
  scriptSession,
  TestApp,
} from '../../test-app';

describe('Usuario', () => {
  let t: TestApp;

  beforeEach(async () => (t = await createTestApp()));
  afterEach(() => t.app.close());

  describe('GET /users/me', () => {
    it('returns the Usuario resolved from the Clerk token as { id, name, email }', async () => {
      scriptSession(t);
      t.users.findById.mockResolvedValue(ANA);

      const res = await t.http
        .get('/users/me')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual({
        id: 1,
        name: 'Ana Pérez',
        email: 'ana@example.com',
      });
      expect(t.users.findById).toHaveBeenCalledWith(ANA.id);
    });

    it('creates the User from the Clerk profile on its first request', async () => {
      t.clerkAuth.verifyToken.mockResolvedValue({
        clerkId: 'user_clerk_new',
        orgId: null,
      });
      t.users.findByClerkId.mockResolvedValue(null);
      t.clerkAuth.getProfile.mockResolvedValue({
        name: 'New Owner',
        email: 'new-owner@example.com',
      });
      t.users.create.mockResolvedValue({
        ...ANA,
        id: 99,
        clerkId: 'user_clerk_new',
        name: 'New Owner',
        email: 'new-owner@example.com',
      });
      t.users.findById.mockResolvedValue({
        ...ANA,
        id: 99,
        clerkId: 'user_clerk_new',
        name: 'New Owner',
        email: 'new-owner@example.com',
      });

      const res = await t.http
        .get('/users/me')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.users.create).toHaveBeenCalledWith({
        clerkId: 'user_clerk_new',
        name: 'New Owner',
        email: 'new-owner@example.com',
      });
      expect(res.body).toEqual({
        id: 99,
        name: 'New Owner',
        email: 'new-owner@example.com',
      });
    });

    it('answers 401 without a Clerk token', async () => {
      await t.http.get('/users/me').expect(401);
    });

    it('answers 401 for an invalid or expired Clerk token', async () => {
      await t.http.get('/users/me').set(bearer('garbage')).expect(401);
    });

    it('answers a database failure with a generic 500', async () => {
      scriptSession(t);
      t.users.findById.mockRejectedValue(
        new DatabaseOperationError('Database operation failed', {
          cause: new Error('connection refused at 10.0.0.1'),
        }),
      );

      const res = await t.http
        .get('/users/me')
        .set(bearer(CLERK_TOKEN))
        .expect(500);

      expect(res.body).toEqual({
        statusCode: 500,
        message: 'Database operation failed',
      });
    });
  });

  describe('PATCH /users/me', () => {
    beforeEach(() => {
      scriptSession(t);
      t.users.update.mockResolvedValue(ANA);
      t.users.findById.mockResolvedValue(ANA);
    });

    it('updates the name', async () => {
      t.users.update.mockResolvedValue({ ...ANA, name: 'Ana María' });

      const res = await t.http
        .patch('/users/me')
        .set(bearer(CLERK_TOKEN))
        .send({ name: '  Ana María ' })
        .expect(200);

      expect(t.users.update).toHaveBeenCalledWith(ANA.id, {
        name: 'Ana María',
      });
      expect(res.body).toEqual({
        id: 1,
        name: 'Ana María',
        email: 'ana@example.com',
      });
    });

    it('leaves the Usuario unchanged and answers with it when no field is sent', async () => {
      const res = await t.http
        .patch('/users/me')
        .set(bearer(CLERK_TOKEN))
        .send({})
        .expect(200);

      expect(t.users.update).not.toHaveBeenCalled();
      expect(res.body).toEqual({
        id: 1,
        name: 'Ana Pérez',
        email: 'ana@example.com',
      });
    });

    it('answers 401 without a Clerk token', async () => {
      await t.http.patch('/users/me').send({ name: 'Ana María' }).expect(401);
    });

    it.each([
      ['a blank name', { name: ' ' }],
      ['a null name', { name: null }],
      ['an email', { email: 'ana@example.com' }],
      ['a role', { role: 'ADMIN' }],
    ])(
      'rejects %s with 400, without reaching the repository',
      async (_, body) => {
        await t.http
          .patch('/users/me')
          .set(bearer(CLERK_TOKEN))
          .send(body)
          .expect(400);

        expect(t.users.update).not.toHaveBeenCalled();
      },
    );
  });

  it.each(['/users', '/users/1', '/sessions'])(
    '%s does not exist',
    async (path) => {
      await t.http.get(path).expect(404);
    },
  );

  it('allows cross-origin requests from the front', async () => {
    const res = await t.http
      .options('/users/me')
      .set('Origin', 'http://localhost:3001')
      .set('Access-Control-Request-Method', 'PATCH')
      .expect(204);

    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});
