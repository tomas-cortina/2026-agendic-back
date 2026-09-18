import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';

@Injectable()
export class VerifyEmployeeUseCase {
  constructor(
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(email: string, code: string): Promise<void> {
    await this.employees.verifyEmail(email, code, this.clock.now());
  }
}
