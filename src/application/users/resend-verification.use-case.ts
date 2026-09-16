import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import { MAILER, Mailer } from '../../domain/mailer';
import { verificationTokenExpiresAt } from '../../domain/users/user';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';

/** Silently does nothing for an unknown email or an already verified Usuario, so the response never leaks which. */
@Injectable()
export class ResendVerificationUseCase {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user || user.emailVerifiedAt) return;
    const token = await this.users.issueVerificationToken(
      user.id,
      verificationTokenExpiresAt(this.clock.now()),
    );
    await this.mailer.sendVerificationLink(user.email, token);
  }
}
