import { Inject, Injectable } from '@nestjs/common';
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

  execute(userId: number, { name, email }: UpdateMeInput): Promise<User> {
    return this.users.update(userId, { name, email });
  }
}
