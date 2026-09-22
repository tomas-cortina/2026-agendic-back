export const CLERK_AUTH = Symbol('ClerkAuth');

export interface ClerkProfile {
  name: string;
  email: string;
}

export interface ClerkAuth {
  /** Verifies a Clerk session JWT, returning the Clerk user id (`sub`). Throws UnauthenticatedError otherwise. */
  verifyToken(token: string | undefined): Promise<string>;
  /** Fetches the profile Clerk holds for a user id, to seed a local User on its first sight. */
  getProfile(clerkId: string): Promise<ClerkProfile>;
}
