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
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { isLastEmployee } from '../services/is-last-employee';
import { assertEmployeeOwner } from './assert-employee-owner';

@Injectable()
export class RetireEmployeeUseCase {
  constructor(
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(
    userId: number,
    employeeId: number,
  ): Promise<{ cancelledBookings: number }> {
    const employee = await assertEmployeeOwner(
      this.employees,
      this.businesses,
      employeeId,
      userId,
    );
    const affected = await this.services.listActiveByEmployee(employeeId);
    if (affected.some((service) => isLastEmployee(service, employeeId)))
      throw new BusinessRuleError(
        "Cannot retire the Employee: they are a Service's last Employee",
      );
    const { cancelledBookings } = await this.employees.retire(
      employee.id,
      this.clock.now(),
    );
    return { cancelledBookings };
  }
}
