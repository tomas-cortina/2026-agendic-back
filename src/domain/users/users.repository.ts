import { User } from './user';

export const USERS_REPOSITORY = Symbol('UsersRepository');

export interface UsersRepository {
  /** Generates the id, createdAt and the USER role, with the email unverified. Throws ConflictError when the email is taken. */
  create(data: Pick<User, 'name' | 'email' | 'passwordHash'>): Promise<User>;
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  /** Leaves undefined fields unchanged. */
  update(id: number, data: Partial<Pick<User, 'name'>>): Promise<User>;
  /** Stores the email as pending, to take effect once verified. Throws ConflictError when it's already registered. */
  setPendingEmail(id: number, email: string): Promise<User>;
  /** Generates a single-use 6-character code expiring at expiresAt for the User's own email (or pendingEmail, if set), replacing any previous one. Returns the raw code; only its hash is stored. */
  issueVerificationCode(userId: number, expiresAt: Date): Promise<string>;
  /**
   * Consumes a single-use code sent to email (the User's own, or their pendingEmail): verifies it, applying pendingEmail if that's what matched.
   * Throws BusinessRuleError for an unknown, already used or expired code, ConflictError if the email is now taken.
   */
  verifyEmail(email: string, code: string, now: Date): Promise<User>;
}
