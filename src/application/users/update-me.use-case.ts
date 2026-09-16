import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import { NotFoundError } from '../../domain/errors';
import { MAILER, Mailer } from '../../domain/mailer';
import {
  UpdateMeInput,
  User,
  verificationTokenExpiresAt,
} from '../../domain/users/user';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';

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
      const token = await this.users.issueVerificationToken(
        userId,
        verificationTokenExpiresAt(this.clock.now()),
      );
      await this.mailer.sendVerificationLink(email, token);
    }
    return user;
  }
}
