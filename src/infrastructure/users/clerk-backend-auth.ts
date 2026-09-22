import {
  createClerkClient,
  verifyToken as verifyClerkToken,
} from '@clerk/backend';
import { Injectable } from '@nestjs/common';
import { UnauthenticatedError } from '../../domain/errors';
import {
  ClerkAuth,
  ClerkIdentity,
  ClerkProfile,
} from '../../domain/users/clerk-auth';

@Injectable()
export class ClerkBackendAuth implements ClerkAuth {
  private readonly clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  async verifyToken(token: string | undefined): Promise<ClerkIdentity> {
    if (!token) throw new UnauthenticatedError('Missing Clerk token');
    try {
      const payload = await verifyClerkToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      return { clerkId: payload.sub, orgId: payload.org_id ?? null };
    } catch (error) {
      throw new UnauthenticatedError('Invalid or expired Clerk token', {
        cause: error,
      });
    }
  }

  async getProfile(clerkId: string): Promise<ClerkProfile> {
    const clerkUser = await this.clerkClient.users.getUser(clerkId);
    const email =
      clerkUser.emailAddresses.find(
        (address) => address.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ?? '';
    const name =
      [clerkUser.firstName, clerkUser.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || email;
    return { name, email };
  }

  async createOrganization(name: string, clerkId: string) {
    const organization =
      await this.clerkClient.organizations.createOrganization({
        name,
        createdBy: clerkId,
      });
    return organization.id;
  }

  async inviteToOrganization(orgId: string, email: string, inviterId: string) {
    await this.clerkClient.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: email,
      role: 'org:member',
      inviterUserId: inviterId,
    });
  }
}
