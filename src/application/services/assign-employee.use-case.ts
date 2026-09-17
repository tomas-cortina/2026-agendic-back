import { Inject, Injectable } from '@nestjs/common';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { BusinessRuleError, NotFoundError } from '../../domain/errors';
import { Service } from '../../domain/services/service';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { assertBranchOwner } from '../branches/assert-branch-owner';

@Injectable()
export class AssignEmployeeUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
  ) {}

  async execute(
    userId: number,
    serviceId: number,
    employeeId: number,
  ): Promise<Service> {
    const service = await this.services.findById(serviceId);
    if (!service) throw new NotFoundError('Service not found');
    const branch = await assertBranchOwner(
      this.branches,
      this.businesses,
      service.branchId,
      userId,
    );
    const employee = await this.employees.findById(employeeId);
    if (!employee) throw new NotFoundError('Employee not found');
    if (employee.businessId !== branch.businessId || employee.retiredAt !== null)
      throw new BusinessRuleError(
        'The Employee must belong to this Business and not be retired',
      );
    return this.services.addEmployee(serviceId, employeeId);
  }
}
