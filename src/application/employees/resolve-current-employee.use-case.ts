import { Inject, Injectable } from '@nestjs/common';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { Employee } from '../../domain/employees/employee';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { UnauthenticatedError } from '../../domain/errors';
import { CLERK_AUTH, ClerkAuth } from '../../domain/users/clerk-auth';

/**
 * Resolves the Clerk JWT of the current request to a local Employee, creating it on its first
 * sight (just-in-time, no webhook) from the token's active Organization.
 */
@Injectable()
export class ResolveCurrentEmployeeUseCase {
  constructor(
    @Inject(CLERK_AUTH) private readonly clerkAuth: ClerkAuth,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  async execute(token: string | undefined): Promise<Employee> {
    const { clerkId, orgId } = await this.clerkAuth.verifyToken(token);
    const existing = await this.employees.findByClerkId(clerkId);
    if (existing) return existing;
    if (!orgId)
      throw new UnauthenticatedError(
        'Missing active Organization in Clerk token',
      );
    const business = await this.businesses.findByClerkOrgId(orgId);
    if (!business) throw new UnauthenticatedError('Unknown Organization');
    const profile = await this.clerkAuth.getProfile(clerkId);
    return this.employees.create({
      businessId: business.id,
      clerkId,
      ...profile,
    });
  }
}
