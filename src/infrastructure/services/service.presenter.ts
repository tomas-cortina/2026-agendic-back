import { Service } from '../../domain/services/service';

export const presentService = (service: Service) => ({
  id: service.id,
  businessId: service.businessId,
  name: service.name,
  description: service.description,
  durationMinutes: service.durationMinutes,
  price: service.price,
});
