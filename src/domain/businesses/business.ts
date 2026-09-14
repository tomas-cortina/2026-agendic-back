export interface Business {
  id: number;
  name: string;
  description: string;
  ownerId: number;
}

export interface CreateBusinessInput {
  name: string;
  description: string;
}

export interface UpdateBusinessInput {
  name?: string;
  description?: string;
}
