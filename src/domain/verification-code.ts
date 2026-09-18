const VERIFICATION_CODE_LIFETIME_MS = 15 * 60 * 1000;
const INVITATION_CODE_LIFETIME_MS = 24 * 60 * 60 * 1000;

/** For a Usuario confirming their own (or pending) email: short-lived, since they're waiting for it. */
export const verificationCodeExpiresAt = (issuedAt: Date) =>
  new Date(issuedAt.getTime() + VERIFICATION_CODE_LIFETIME_MS);

/** For an Empleado invited by a Dueño: longer-lived, since the invitee isn't expecting it. */
export const invitationCodeExpiresAt = (issuedAt: Date) =>
  new Date(issuedAt.getTime() + INVITATION_CODE_LIFETIME_MS);
