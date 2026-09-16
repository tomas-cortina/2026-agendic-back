import { Service } from '../../domain/services/service';

export const presentService = (service: Service) => ({
  id: service.id,
  branchId: service.branchId,
  name: service.name,
  description: service.description,
  durationMinutes: service.durationMinutes,
  price: service.price,
});
