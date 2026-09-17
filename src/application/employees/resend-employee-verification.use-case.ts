import { Inject, Injectable } from '@nestjs/common';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { CLOCK, Clock } from '../../domain/clock';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { BusinessRuleError } from '../../domain/errors';
import { MAILER, Mailer } from '../../domain/mailer';
import { verificationTokenExpiresAt } from '../../domain/users/user';
import { assertEmployeeOwner } from './assert-employee-owner';

@Injectable()
export class ResendEmployeeVerificationUseCase {
  constructor(
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(userId: number, employeeId: number): Promise<void> {
    const employee = await assertEmployeeOwner(
      this.employees,
      this.businesses,
      employeeId,
      userId,
    );
    if (employee.emailVerifiedAt)
      throw new BusinessRuleError('Employee already verified');
    const token = await this.employees.issueVerificationToken(
      employee.id,
      verificationTokenExpiresAt(this.clock.now()),
    );
    await this.mailer.sendVerificationLink(employee.email, token);
  }
}
