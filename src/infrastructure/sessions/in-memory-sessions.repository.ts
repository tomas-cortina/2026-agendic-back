import { randomBytes } from 'node:crypto';
import { Session } from '../../domain/sessions/session';
import { SessionsRepository } from '../../domain/sessions/sessions.repository';

export class InMemorySessionsRepository implements SessionsRepository {
  private readonly sessions = new Map<string, Session>();

  async create(data: Omit<Session, 'id'>) {
    const session = { id: randomBytes(32).toString('base64url'), ...data };
    this.sessions.set(session.id, session);
    return { ...session };
  }

  async findById(id: string) {
    const session = this.sessions.get(id);
    return session ? { ...session } : null;
  }

  async delete(id: string) {
    this.sessions.delete(id);
  }
}
