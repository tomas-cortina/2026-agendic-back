import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import { Session, sessionExpiresAt } from '../../domain/sessions/session';
import {
  SESSIONS_REPOSITORY,
  SessionsRepository,
} from '../../domain/sessions/sessions.repository';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';

/** Verifies the email a token was issued for (applying a pending email change, if any) and signs the Usuario in. */
@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(SESSIONS_REPOSITORY) private readonly sessions: SessionsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(token: string): Promise<Session> {
    const user = await this.users.verifyEmail(token, this.clock.now());
    return this.sessions.create({
      userId: user.id,
      expiresAt: sessionExpiresAt(this.clock.now()),
    });
  }
}
