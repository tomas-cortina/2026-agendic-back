import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../domain/errors';
import { User } from '../../domain/users/user';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';

@Injectable()
export class GetMeUseCase {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
  ) {}

  async execute(userId: number): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }
}
