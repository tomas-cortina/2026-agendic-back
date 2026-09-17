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
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { assertBranchOwner } from '../branches/assert-branch-owner';
import { isLastVerifiedEmployee } from './is-last-verified-employee';

@Injectable()
export class RemoveEmployeeUseCase {
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
  ): Promise<{ cancelledBookings: number }> {
    const service = await this.services.findById(serviceId);
    if (!service) throw new NotFoundError('Service not found');
    await assertBranchOwner(
      this.branches,
      this.businesses,
      service.branchId,
      userId,
    );
    const employee = await this.employees.findById(employeeId);
    if (!employee) throw new NotFoundError('Employee not found');
    if (isLastVerifiedEmployee(service, employeeId))
      throw new BusinessRuleError(
        "Cannot remove the Service's last verified Employee",
      );
    await this.services.removeEmployee(serviceId, employeeId);
    return { cancelledBookings: 0 };
  }
}
