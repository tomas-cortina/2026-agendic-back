import { Business } from '../../domain/businesses/business';

export const presentBusiness = (business: Business) => ({
  id: business.id,
  name: business.name,
  description: business.description,
  ownerId: business.ownerId,
});
