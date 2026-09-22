export const MAILER = Symbol('Mailer');

export interface Mailer {
  /** Sends an email with a link carrying the verification token. */
  sendVerificationLink(email: string, token: string): Promise<void>;
}
