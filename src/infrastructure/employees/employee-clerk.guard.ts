import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { ResolveCurrentEmployeeUseCase } from '../../application/employees/resolve-current-employee.use-case';
import { extractBearerToken } from '../bearer-token';

type AuthenticatedRequest = Request & { employeeId: number };

/** Resolves `Authorization: Bearer <Clerk JWT>` for an Empleado; read the result with `@CurrentEmployee()`. */
@Injectable()
export class EmployeeClerkGuard implements CanActivate {
  constructor(
    private readonly resolveCurrentEmployee: ResolveCurrentEmployeeUseCase,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);
    const employee = await this.resolveCurrentEmployee.execute(token);
    request.employeeId = employee.id;
    return true;
  }
}

export const CurrentEmployee = createParamDecorator(
  (_: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().employeeId,
);
