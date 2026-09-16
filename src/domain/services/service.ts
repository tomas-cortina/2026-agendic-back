export interface Service {
  id: number;
  branchId: number;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  retiredAt: Date | null;
}

export interface CreateServiceInput {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
}

export interface UpdateServiceInput {
  name?: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
}
