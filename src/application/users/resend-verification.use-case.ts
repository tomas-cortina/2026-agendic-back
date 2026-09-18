import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import { MAILER, Mailer } from '../../domain/mailer';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';
import { verificationCodeExpiresAt } from '../../domain/verification-code';

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
    const code = await this.users.issueVerificationCode(
      user.id,
      verificationCodeExpiresAt(this.clock.now()),
    );
    await this.mailer.sendVerificationCode(user.email, code);
  }
}
