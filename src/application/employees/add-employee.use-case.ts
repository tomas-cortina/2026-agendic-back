import { Inject, Injectable } from '@nestjs/common';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { Employee } from '../../domain/employees/employee';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { MAILER, Mailer } from '../../domain/mailer';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';
import { invitationCodeExpiresAt } from '../../domain/verification-code';
import { assertOwner } from '../businesses/assert-owner';

export interface AddEmployeeInput {
  name: string;
  email: string;
}

/** Trusts an email at once when it's an already verified Usuario's; otherwise sends a verification code. */
@Injectable()
export class AddEmployeeUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(
    userId: number,
    businessId: number,
    input: AddEmployeeInput,
  ): Promise<Employee> {
    assertOwner(await this.businesses.findById(businessId), userId);
    const now = this.clock.now();
    const trustedUser = await this.users.findByEmail(input.email);
    const emailVerifiedAt = trustedUser?.emailVerifiedAt ? now : null;
    const employee = await this.employees.create({
      businessId,
      name: input.name,
      email: input.email,
      emailVerifiedAt,
    });
    if (!emailVerifiedAt) {
      const code = await this.employees.issueVerificationCode(
        employee.id,
        invitationCodeExpiresAt(now),
      );
      await this.mailer.sendVerificationCode(employee.email, code);
    }
    return employee;
  }
}
