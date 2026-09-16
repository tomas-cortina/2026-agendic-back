import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import { ForbiddenError, UnauthenticatedError } from '../../domain/errors';
import {
  Session,
  sessionExpiresAt,
  SignInInput,
} from '../../domain/sessions/session';
import {
  SESSIONS_REPOSITORY,
  SessionsRepository,
} from '../../domain/sessions/sessions.repository';
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '../../domain/users/password-hasher';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';

@Injectable()
export class SignInUseCase {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(SESSIONS_REPOSITORY) private readonly sessions: SessionsRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute({ email, password }: SignInInput): Promise<Session> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      // Same hashing work as a wrong password, so response time doesn't reveal registered emails.
      await this.passwordHasher.hash(password);
      throw new UnauthenticatedError(INVALID_CREDENTIALS);
    }
    if (!(await this.passwordHasher.verify(password, user.passwordHash)))
      throw new UnauthenticatedError(INVALID_CREDENTIALS);
    if (!user.emailVerifiedAt) throw new ForbiddenError('Email not verified');
    return this.sessions.create({
      userId: user.id,
      expiresAt: sessionExpiresAt(this.clock.now()),
    });
  }
}

const INVALID_CREDENTIALS = 'Invalid email or password';
