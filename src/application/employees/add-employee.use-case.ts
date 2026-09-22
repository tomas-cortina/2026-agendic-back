import { Inject, Injectable } from '@nestjs/common';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { NotFoundError } from '../../domain/errors';
import { CLERK_AUTH, ClerkAuth } from '../../domain/users/clerk-auth';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';
import { assertOwner } from '../businesses/assert-owner';

export interface AddEmployeeInput {
  email: string;
}

/**
 * Invites the email to the Business's Clerk Organization; the local Employee row is created
 * just-in-time, on their first authenticated request (see ResolveCurrentEmployeeUseCase).
 */
@Injectable()
export class AddEmployeeUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(CLERK_AUTH) private readonly clerkAuth: ClerkAuth,
  ) {}

  async execute(
    userId: number,
    businessId: number,
    input: AddEmployeeInput,
  ): Promise<void> {
    const business = await this.businesses.findById(businessId);
    assertOwner(business, userId);
    const owner = await this.users.findById(userId);
    if (!owner) throw new NotFoundError('User not found');
    await this.clerkAuth.inviteToOrganization(
      business.clerkOrgId,
      input.email,
      owner.clerkId,
    );
  }
}
