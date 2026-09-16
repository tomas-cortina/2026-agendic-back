import { Inject, Injectable } from '@nestjs/common';
import { assertValidHours } from '../../domain/branches/branch';
import { CreateBusinessInput } from '../../domain/businesses/business';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
  CreatedBusiness,
} from '../../domain/businesses/businesses.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { NotFoundError } from '../../domain/errors';
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
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(
    ownerId: number,
    input: CreateBusinessInput,
  ): Promise<CreatedBusiness> {
    assertValidHours(input.branch.opensAt, input.branch.closesAt);
    const owner = await this.users.findById(ownerId);
    if (!owner) throw new NotFoundError('User not found');
    return this.businesses.create({
      business: { ...input.business, ownerId },
      branch: input.branch,
      service: {
        ...input.service,
        description: input.service.description ?? null,
      },
      // ponytail: verified unconditionally because a Usuario's email can't be unverified yet. Once ticket 04
      // lands User.emailVerifiedAt, carry that over instead of assuming it.
      employee: {
        name: owner.name,
        email: owner.email,
        emailVerifiedAt: this.clock.now(),
      },
    });
  }
}
