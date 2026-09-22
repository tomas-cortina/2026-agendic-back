import { Request } from 'express';

/** Pulls the token out of an `Authorization: Bearer <token>` header, if present. */
export const extractBearerToken = (request: Request): string | undefined =>
  /^Bearer (\S+)$/i.exec(request.headers.authorization ?? '')?.[1];
