import { Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { Mailer } from '../domain/mailer';

@Injectable()
export class NodemailerMailer implements Mailer {
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }

  async sendVerificationLink(email: string, token: string) {
    const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Verify your account',
      html: `<p>Click <a href="${link}">here</a> to verify your account.</p>`,
    });
  }
}
