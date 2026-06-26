import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mailer.service';

/**
 * Global Mail module.
 * Any service can inject MailService without re-importing this module.
 *
 * The actual transporter (Nodemailer SMTP client) is created LAZILY
 * inside MailService — only when the first email is sent. This way:
 *   - If MAIL_USER/MAIL_PASSWORD are missing, the app still boots.
 *   - If sending fails, the rest of the app keeps working.
 *   - We don't pay the SMTP connection cost at boot.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailerModule {}
