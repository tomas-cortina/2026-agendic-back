import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { PasswordHasher } from '../../domain/users/password-hasher';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keyLength: number,
) => Promise<Buffer>;
const KEY_LENGTH = 64;

/** Stores `<salt hex>:<key hex>`. */
export class ScryptPasswordHasher implements PasswordHasher {
  async hash(password: string) {
    const salt = randomBytes(16);
    const key = await scryptAsync(password, salt, KEY_LENGTH);
    return `${salt.toString('hex')}:${key.toString('hex')}`;
  }

  async verify(password: string, passwordHash: string) {
    const [salt, key] = passwordHash
      .split(':')
      .map((part) => Buffer.from(part, 'hex'));
    return timingSafeEqual(await scryptAsync(password, salt, KEY_LENGTH), key);
  }
}
