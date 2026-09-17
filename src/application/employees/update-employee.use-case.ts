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
import { assertEmployeeOwner } from './assert-employee-owner';

@Injectable()
export class UpdateEmployeeUseCase {
  constructor(
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
  ) {}

  async execute(
    userId: number,
    employeeId: number,
    name: string,
  ): Promise<Employee> {
    await assertEmployeeOwner(
      this.employees,
      this.businesses,
      employeeId,
      userId,
    );
    return this.employees.update(employeeId, { name });
  }
}
