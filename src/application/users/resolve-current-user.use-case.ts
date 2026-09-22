import { Inject, Injectable } from '@nestjs/common';
import { CLERK_AUTH, ClerkAuth } from '../../domain/users/clerk-auth';
import { User } from '../../domain/users/user';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';

/** Resolves the Clerk JWT of the current request to a local User, creating it on its first sight. */
@Injectable()
export class ResolveCurrentUserUseCase {
  constructor(
    @Inject(CLERK_AUTH) private readonly clerkAuth: ClerkAuth,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
  ) {}

  async execute(token: string | undefined): Promise<User> {
    const { clerkId } = await this.clerkAuth.verifyToken(token);
    const existing = await this.users.findByClerkId(clerkId);
    if (existing) return existing;
    const profile = await this.clerkAuth.getProfile(clerkId);
    return this.users.create({ clerkId, ...profile });
  }
}
