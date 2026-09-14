import { Session } from '../../domain/sessions/session';

export const presentSession = (session: Session) => ({
  sessionId: session.id,
  expiresAt: session.expiresAt.toISOString(),
});
