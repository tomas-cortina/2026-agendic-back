import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import { NotFoundError } from '../../domain/errors';
import { MAILER, Mailer } from '../../domain/mailer';
import { UpdateMeInput, User } from '../../domain/users/user';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';
import { verificationCodeExpiresAt } from '../../domain/verification-code';

@Injectable()
export class UpdateMeUseCase {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(userId: number, { name, email }: UpdateMeInput): Promise<User> {
    let user =
      name !== undefined
        ? await this.users.update(userId, { name })
        : await this.users.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    if (email !== undefined) {
      user = await this.users.setPendingEmail(userId, email);
      const code = await this.users.issueVerificationCode(
        userId,
        verificationCodeExpiresAt(this.clock.now()),
      );
      await this.mailer.sendVerificationCode(email, code);
    }
    return user;
  }
}
