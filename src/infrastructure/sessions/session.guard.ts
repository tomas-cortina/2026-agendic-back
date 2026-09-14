import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { ValidateSessionUseCase } from '../../application/sessions/validate-session.use-case';
import { Session } from '../../domain/sessions/session';

type AuthenticatedRequest = Request & { session: Session };

/** Resolves `Authorization: Bearer <sessionId>`; read the result with `@CurrentSession()`. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly validateSession: ValidateSessionUseCase) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const sessionId = /^Bearer (\S+)$/i.exec(
      request.headers.authorization ?? '',
    )?.[1];
    request.session = await this.validateSession.execute(sessionId);
    return true;
  }
}

export const CurrentSession = createParamDecorator(
  (_: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().session,
);
