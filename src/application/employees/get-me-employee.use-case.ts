import { Inject, Injectable } from '@nestjs/common';
import { Employee } from '../../domain/employees/employee';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { NotFoundError } from '../../domain/errors';

@Injectable()
export class GetMeEmployeeUseCase {
  constructor(
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
  ) {}

  async execute(employeeId: number): Promise<Employee> {
    const employee = await this.employees.findById(employeeId);
    if (!employee) throw new NotFoundError('Employee not found');
    return employee;
  }
}
