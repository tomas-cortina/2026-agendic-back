import { Inject, Injectable } from '@nestjs/common';
import {
  SESSIONS_REPOSITORY,
  SessionsRepository,
} from '../../domain/sessions/sessions.repository';

@Injectable()
export class SignOutUseCase {
  constructor(
    @Inject(SESSIONS_REPOSITORY) private readonly sessions: SessionsRepository,
  ) {}

  execute(sessionId: string): Promise<void> {
    return this.sessions.delete(sessionId);
  }
}
