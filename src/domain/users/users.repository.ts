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
  /** Generates a single-use token expiring at expiresAt for the User's own email (or pendingEmail, if set), replacing any previous one. Returns the raw token; only its hash is stored. */
  issueVerificationToken(userId: number, expiresAt: Date): Promise<string>;
  /**
   * Consumes a single-use token: verifies the email, applying pendingEmail if one was set.
   * Throws BusinessRuleError for an unknown, already used or expired token, ConflictError if the email is now taken.
   */
  verifyEmail(token: string, now: Date): Promise<User>;
}
