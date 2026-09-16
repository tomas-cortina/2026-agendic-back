import { Injectable, Logger } from '@nestjs/common';
import { Mailer } from '../domain/mailer';

// ponytail: only logs the link; a real email provider is still pending.
@Injectable()
export class LoggingMailer implements Mailer {
  private readonly logger = new Logger(LoggingMailer.name);

  async sendVerificationLink(email: string, token: string) {
    this.logger.log(`Verification link for ${email}: token=${token}`);
  }
}
