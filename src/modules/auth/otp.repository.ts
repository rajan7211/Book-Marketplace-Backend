import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Otp, OtpDocument } from './schemas/otp.schema';
import { OtpPurpose } from './enums/otp-purpose.enum';

/**
 * Repository for the Otp collection.
 * Pure data access — no business rules, no bcrypt, no email.
 */
@Injectable()
export class OtpRepository {
  constructor(
    @InjectModel(Otp.name) private readonly model: Model<OtpDocument>,
  ) {}

  async findActive(
    email: string,
    purpose: OtpPurpose,
  ): Promise<OtpDocument | null> {
    const doc = await this.model
      .findOne({
        email: email.toLowerCase(),
        purpose,
        expiresAt: { $gt: new Date() },
      })
      .select('+otpHash +passwordHash')
      .exec();
    return doc;
  }

  /**
   * Insert OR replace the OTP document for (email, purpose).
   *
   * Pass `customerData` for customer registration, `sellerData` for seller
   * registration. Leave both undefined for PASSWORD_RESET.
   */
  async upsert(
    email: string,
    purpose: OtpPurpose,
    otpHash: string,
    expiresAt: Date,
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
  ): Promise<OtpDocument> {
    return this.model
      .findOneAndUpdate(
        { email: email.toLowerCase(), purpose },
        {
          $set: {
            otpHash,
            expiresAt,
            attempts: 0,
            verified: false,
            // customer fields
            firstName: customerData?.firstName ?? null,
            lastName: customerData?.lastName ?? null,
            // seller fields
            businessName: sellerData?.businessName ?? null,
            contactPerson: sellerData?.contactPerson ?? null,
            mobile: sellerData?.mobile ?? null,
            // shared
            passwordHash:
              customerData?.passwordHash ?? sellerData?.passwordHash ?? null,
          },
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.model.updateOne({ _id: id }, { $inc: { attempts: 1 } }).exec();
  }

  async markVerified(id: string): Promise<void> {
    await this.model.updateOne({ _id: id }, { $set: { verified: true } }).exec();
  }

  async deleteById(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id }).exec();
  }
}
