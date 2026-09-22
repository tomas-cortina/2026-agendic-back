import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../domain/errors';
import { UpdateMeInput, User } from '../../domain/users/user';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';

@Injectable()
export class UpdateMeUseCase {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
  ) {}

  async execute(userId: number, { name }: UpdateMeInput): Promise<User> {
    if (name === undefined) {
      const user = await this.users.findById(userId);
      if (!user) throw new NotFoundError('User not found');
      return user;
    }
    return this.users.update(userId, { name });
  }
}
