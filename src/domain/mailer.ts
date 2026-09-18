export const MAILER = Symbol('Mailer');

export interface Mailer {
  /** Sends an email with a link carrying the verification token. */
  sendVerificationLink(email: string, token: string): Promise<void>;
  /** Sends an email with the 6-character code to confirm the (pending) email address. */
  sendVerificationCode(email: string, code: string): Promise<void>;
}
