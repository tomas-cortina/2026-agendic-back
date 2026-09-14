import { BusinessRuleError } from '../errors';

export interface Branch {
  id: number;
  businessId: number;
  name: string;
  address: string;
  opensAt: string; // HH:mm
  closesAt: string; // HH:mm
}

export interface CreateBranchInput {
  name: string;
  address: string;
  opensAt: string;
  closesAt: string;
}

export interface UpdateBranchInput {
  name?: string;
  address?: string;
  opensAt?: string;
  closesAt?: string;
}

/** HH:mm strings are zero-padded and same length, so lexical comparison matches time-of-day order. */
export function assertValidHours(opensAt: string, closesAt: string): void {
  if (opensAt >= closesAt)
    throw new BusinessRuleError('closesAt must be after opensAt');
}
