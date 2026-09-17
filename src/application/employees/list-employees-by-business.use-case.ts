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
import { assertOwner } from '../businesses/assert-owner';

@Injectable()
export class ListEmployeesByBusinessUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
  ) {}

  async execute(userId: number, businessId: number): Promise<Employee[]> {
    assertOwner(await this.businesses.findById(businessId), userId);
    return this.employees.listActiveByBusiness(businessId);
  }
}
