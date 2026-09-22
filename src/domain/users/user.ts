export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface User {
  id: number;
  clerkId: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}

export interface UpdateMeInput {
  name?: string;
}
