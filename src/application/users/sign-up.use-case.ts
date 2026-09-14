import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import { Session, sessionExpiresAt } from '../../domain/sessions/session';
import {
  SESSIONS_REPOSITORY,
  SessionsRepository,
} from '../../domain/sessions/sessions.repository';
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '../../domain/users/password-hasher';
import { SignUpInput } from '../../domain/users/user';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';

@Injectable()
export class SignUpUseCase {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(SESSIONS_REPOSITORY) private readonly sessions: SessionsRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute({ name, email, password }: SignUpInput): Promise<Session> {
    const passwordHash = await this.passwordHasher.hash(password);
    const user = await this.users.create({ name, email, passwordHash });
    return this.sessions.create({
      userId: user.id,
      expiresAt: sessionExpiresAt(this.clock.now()),
    });
  }
}
