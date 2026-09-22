import { User } from './user';

export const USERS_REPOSITORY = Symbol('UsersRepository');

export interface UsersRepository {
  /** Generates the id, createdAt and the USER role. Called once per Clerk identity, on its first request. */
  create(data: Pick<User, 'clerkId' | 'name' | 'email'>): Promise<User>;
  findById(id: number): Promise<User | null>;
  findByClerkId(clerkId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  /** Leaves undefined fields unchanged. */
  update(id: number, data: Partial<Pick<User, 'name'>>): Promise<User>;
}
