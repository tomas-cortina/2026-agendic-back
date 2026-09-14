import { Session } from './session';

export const SESSIONS_REPOSITORY = Symbol('SessionsRepository');

export interface SessionsRepository {
  /** Generates a random, unguessable id. */
  create(data: Omit<Session, 'id'>): Promise<Session>;
  findById(id: string): Promise<Session | null>;
  delete(id: string): Promise<void>;
}
