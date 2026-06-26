import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * MailService wraps Nodemailer.
 *
 * Usage:
 *   await this.mail.sendEmail({
 *     to: 'user@example.com',
 *     subject: 'Your OTP code',
 *     html: '<p>Your code is 123456</p>',
 *   });
 *
 * Safety rules:
 *   - If MAIL is not configured (enabled === false), `sendEmail` returns
 *     without throwing. The app keeps working; we just skip email.
 *   - If SMTP fails, we LOG the error but don't throw. Email failures
 *     must NEVER crash the order flow.
 *   - We never include the OTP or password in log output.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  /**
   * Lazily create the SMTP transporter on first use.
   * `createTransport` doesn't open a connection — it just prepares the
   * client. The connection happens when we call `sendMail`.
   */
  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;

    const enabled = this.config.get<boolean>('mail.enabled');
    if (!enabled) return null;

    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('mail.host'),
      port: this.config.get<number>('mail.port'),
      secure: false,             // Gmail uses STARTTLS on port 587
      auth: {
        user: this.config.get<string>('mail.user'),
        pass: this.config.get<string>('mail.password'),
      },
    });

    return this.transporter;
  }

  /**
   * Send an email. Never throws — email failures must not break the app.
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<boolean> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(
        `Mail not configured. Skipping email to ${options.to}: "${options.subject}"`,
      );
      return false;
    }

    const from = this.config.get<string>('mail.from') ?? 'no-reply@bookmarketplace.com';

    try {
      await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text ?? options.html.replace(/<[^>]*>/g, ''), // strip tags
      });
      this.logger.log(`Email sent to ${options.to}: "${options.subject}"`);
      return true;
    } catch (err) {
      this.logger.error(
        `Failed to send email to ${options.to}: "${options.subject}"`,
        (err as Error).stack,
      );
      return false;
    }
  }
}
