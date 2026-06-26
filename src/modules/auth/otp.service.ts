import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { OtpRepository } from './otp.repository';
import { OtpPurpose } from './enums/otp-purpose.enum';
import { MailService } from '../../infra/mailer/mailer.service';
import { buildOtpEmail, buildResetPasswordEmail } from '../../infra/mailer/templates';

export interface VerifiedOtp {
  email: string;
  purpose: OtpPurpose;
  // customer
  firstName?: string;
  lastName?: string;
  // seller
  businessName?: string;
  contactPerson?: string;
  mobile?: string;
  // shared
  passwordHash?: string;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly RESEND_COOLDOWN_SECONDS = 60;
  private readonly MAX_ATTEMPTS = 5;
  private readonly SALT_ROUNDS: number;

  constructor(
    private readonly repo: OtpRepository,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {
    this.SALT_ROUNDS = this.config.get<number>('app.bcryptSaltRounds') ?? 10;
  }

  async sendOtp(
    email: string,
    purpose: OtpPurpose,
    customerData?: {
      firstName: string;
      lastName: string;
      passwordHash: string;
    },
    sellerData?: {
      businessName: string;
      contactPerson: string;
      mobile: string;
      passwordHash: string;
    },
  ): Promise<void> {
    const lower = email.toLowerCase();

    const existing = await this.repo.findActive(lower, purpose);
    if (existing) {
      const secondsSinceCreated =
        (Date.now() - existing.createdAt.getTime()) / 1000;
      if (secondsSinceCreated < this.RESEND_COOLDOWN_SECONDS) {
        const wait = Math.ceil(
          this.RESEND_COOLDOWN_SECONDS - secondsSinceCreated,
        );
        throw new ConflictException(
          `Please wait ${wait} seconds before requesting a new code.`,
        );
      }
    }

    const code = this.generateOtp();
    const hash = await bcrypt.hash(code, this.SALT_ROUNDS);
    const expiresAt = new Date(
      Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    await this.repo.upsert(
      lower,
      purpose,
      hash,
      expiresAt,
      customerData,
      sellerData,
    );

    const subject =
      purpose === OtpPurpose.REGISTRATION
        ? 'Verify your Book Marketplace account'
        : 'Reset your Book Marketplace password';

    const html =
      purpose === OtpPurpose.REGISTRATION
        ? buildOtpEmail('there', code)
        : buildResetPasswordEmail('there', code);

    const sent = await this.mail.sendEmail({ to: lower, subject, html });
    if (!sent) {
      this.logger.warn(
        `OTP generated but email NOT sent (mail disabled or SMTP failed) for ${lower}`,
      );
    }
  }

  async verifyOtp(
    email: string,
    purpose: OtpPurpose,
    plainOtp: string,
  ): Promise<VerifiedOtp> {
    const lower = email.toLowerCase();
    const record = await this.repo.findActive(lower, purpose);
    if (!record) {
      throw new BadRequestException(
        'No active verification code found. Please request a new one.',
      );
    }

    if (record.attempts >= this.MAX_ATTEMPTS) {
      await this.repo.deleteById(record._id.toString());
      throw new BadRequestException(
        'Too many wrong attempts. Please request a new code.',
      );
    }

    const matches = await bcrypt.compare(plainOtp, record.otpHash);
    if (!matches) {
      await this.repo.incrementAttempts(record._id.toString());
      const remaining = this.MAX_ATTEMPTS - record.attempts - 1;
      throw new BadRequestException(
        `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      );
    }

    const verified: VerifiedOtp = {
      email: record.email,
      purpose: record.purpose,
      firstName: record.firstName ?? undefined,
      lastName: record.lastName ?? undefined,
      businessName: record.businessName ?? undefined,
      contactPerson: record.contactPerson ?? undefined,
      mobile: record.mobile ?? undefined,
      passwordHash: record.passwordHash ?? undefined,
    };

    await this.repo.markVerified(record._id.toString());
    await this.repo.deleteById(record._id.toString());

    return verified;
  }

  private generateOtp(): string {
    const code = randomInt(0, 1_000_000).toString();
    return code.padStart(this.OTP_LENGTH, '0');
  }
}
