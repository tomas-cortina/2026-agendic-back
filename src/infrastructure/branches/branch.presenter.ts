import { Branch } from '../../domain/branches/branch';

export const presentBranch = (branch: Branch) => ({
  id: branch.id,
  businessId: branch.businessId,
  name: branch.name,
  address: branch.address,
  opensAt: branch.opensAt,
  closesAt: branch.closesAt,
});
