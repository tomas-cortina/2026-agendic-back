import { ScryptPasswordHasher } from './scrypt-password-hasher';

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher();

  it('verifies a password against its own hash, and rejects a wrong one', async () => {
    const passwordHash = await hasher.hash('correct-horse-battery');

    expect(passwordHash).not.toContain('correct-horse-battery');
    await expect(
      hasher.verify('correct-horse-battery', passwordHash),
    ).resolves.toBe(true);
    await expect(
      hasher.verify('wrong-password-123', passwordHash),
    ).resolves.toBe(false);
  });
});
