import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import { MAILER, Mailer } from '../../domain/mailer';
import { SignUpInput, User } from '../../domain/users/user';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '../../domain/users/password-hasher';
import { verificationCodeExpiresAt } from '../../domain/verification-code';

@Injectable()
export class SignUpUseCase {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute({ name, email, password }: SignUpInput): Promise<User> {
    const passwordHash = await this.passwordHasher.hash(password);
    const user = await this.users.create({ name, email, passwordHash });
    const code = await this.users.issueVerificationCode(
      user.id,
      verificationCodeExpiresAt(this.clock.now()),
    );
    await this.mailer.sendVerificationCode(user.email, code);
    return user;
  }
}
