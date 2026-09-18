export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface User {
  id: number;
  name: string;
  email: string;
  pendingEmail: string | null;
  passwordHash: string;
  role: Role;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export interface UpdateMeInput {
  name?: string;
  email?: string;
}
