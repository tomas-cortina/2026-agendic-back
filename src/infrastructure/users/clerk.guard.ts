import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { ResolveCurrentUserUseCase } from '../../application/users/resolve-current-user.use-case';
import { extractBearerToken } from '../bearer-token';

type AuthenticatedRequest = Request & { userId: number };

/** Resolves `Authorization: Bearer <Clerk JWT>`; read the result with `@CurrentUser()`. */
@Injectable()
export class ClerkGuard implements CanActivate {
  constructor(private readonly resolveCurrentUser: ResolveCurrentUserUseCase) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);
    const user = await this.resolveCurrentUser.execute(token);
    request.userId = user.id;
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().userId,
);
