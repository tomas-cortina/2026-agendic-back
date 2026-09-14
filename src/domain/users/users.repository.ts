import { User } from './user';

export const USERS_REPOSITORY = Symbol('UsersRepository');

export interface UsersRepository {
  /** Generates the id, createdAt and the USER role. Throws ConflictError when the email is taken. */
  create(data: Pick<User, 'name' | 'email' | 'passwordHash'>): Promise<User>;
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  /** Leaves undefined fields unchanged. Throws ConflictError when the email belongs to another User. */
  update(
    id: number,
    data: Partial<Pick<User, 'name' | 'email'>>,
  ): Promise<User>;
}
