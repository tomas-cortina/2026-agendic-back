export const CLERK_AUTH = Symbol('ClerkAuth');

export interface ClerkProfile {
  name: string;
  email: string;
}

export interface ClerkIdentity {
  /** The Clerk user id (`sub`). */
  clerkId: string;
  /** The token's active Organization; null outside an Organization context. */
  orgId: string | null;
}

export interface ClerkAuth {
  /** Verifies a Clerk session JWT. Throws UnauthenticatedError otherwise. */
  verifyToken(token: string | undefined): Promise<ClerkIdentity>;
  /** Fetches the profile Clerk holds for a user id, to seed a local User or Employee on its first sight. */
  getProfile(clerkId: string): Promise<ClerkProfile>;
  /** Creates the Organization backing a new Business, with its Dueño as admin. Returns the Organization's id. */
  createOrganization(name: string, clerkId: string): Promise<string>;
  /** Invites an email to join a Business's Organization as an Empleado. */
  inviteToOrganization(
    orgId: string,
    email: string,
    inviterId: string,
  ): Promise<void>;
}
