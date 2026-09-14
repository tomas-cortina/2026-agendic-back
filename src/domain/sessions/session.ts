export interface Session {
  id: string;
  userId: number;
  expiresAt: Date;
}

export interface SignInInput {
  email: string;
  password: string;
}

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export const sessionExpiresAt = (issuedAt: Date) =>
  new Date(issuedAt.getTime() + SESSION_LIFETIME_MS);
