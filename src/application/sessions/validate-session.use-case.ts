import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import { UnauthenticatedError } from '../../domain/errors';
import { Session } from '../../domain/sessions/session';
import {
  SESSIONS_REPOSITORY,
  SessionsRepository,
} from '../../domain/sessions/sessions.repository';

@Injectable()
export class ValidateSessionUseCase {
  constructor(
    @Inject(SESSIONS_REPOSITORY) private readonly sessions: SessionsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(sessionId: string | undefined): Promise<Session> {
    const session = sessionId ? await this.sessions.findById(sessionId) : null;
    if (!session || session.expiresAt <= this.clock.now()) {
      throw new UnauthenticatedError('Missing, expired or signed-out session');
    }
    return session;
  }
}
