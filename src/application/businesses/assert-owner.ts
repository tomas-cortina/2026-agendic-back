import { Business } from '../../domain/businesses/business';
import { ForbiddenError, NotFoundError } from '../../domain/errors';

export function assertBusinessExists(
  business: Business | null,
): asserts business is Business {
  if (!business) throw new NotFoundError('Business not found');
}

export function assertOwner(
  business: Business | null,
  userId: number,
): asserts business is Business {
  assertBusinessExists(business);
  if (business.ownerId !== userId)
    throw new ForbiddenError('Not the owner of this Business');
}
