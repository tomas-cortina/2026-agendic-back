import { Inject, Injectable } from '@nestjs/common';
import { assertValidHours } from '../../domain/branches/branch';
import { CreateBusinessInput } from '../../domain/businesses/business';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
  CreatedBusiness,
} from '../../domain/businesses/businesses.repository';
import { NotFoundError } from '../../domain/errors';
import { CLERK_AUTH, ClerkAuth } from '../../domain/users/clerk-auth';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';

@Injectable()
export class CreateBusinessUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(CLERK_AUTH) private readonly clerkAuth: ClerkAuth,
  ) {}

  async execute(
    ownerId: number,
    input: CreateBusinessInput,
  ): Promise<CreatedBusiness> {
    assertValidHours(input.branch.opensAt, input.branch.closesAt);
    const owner = await this.users.findById(ownerId);
    if (!owner) throw new NotFoundError('User not found');
    // ponytail: if businesses.create fails after this, the Organization is orphaned in Clerk with no local
    // Business to retry against; add compensation (delete the org) or a reconcile job if that starts happening.
    const clerkOrgId = await this.clerkAuth.createOrganization(
      input.business.name,
      owner.clerkId,
    );
    return this.businesses.create({
      business: { ...input.business, ownerId, clerkOrgId },
      branch: input.branch,
      service: {
        ...input.service,
        description: input.service.description ?? null,
      },
      employee: {
        clerkId: owner.clerkId,
        name: owner.name,
        email: owner.email,
      },
    });
  }
}
