import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OtpPurpose } from '../enums/otp-purpose.enum';

export type OtpDocument = HydratedDocument<Otp>;

/**
 * A PENDING verification.
 *
 * For CUSTOMER REGISTRATION: stores firstName/lastName/passwordHash.
 * For SELLER REGISTRATION:   stores businessName/contactPerson/mobile/passwordHash.
 * For PASSWORD_RESET:        stores nothing except email + otpHash.
 *
 * One document per (email, purpose). After verification the doc is
 * deleted (one-time use).
 */
@Schema({ timestamps: true, collection: 'otps' })
export class Otp {
  /** Email being verified. Lowercased. */
  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  /** Why this OTP was issued. */
  @Prop({ type: String, enum: OtpPurpose, required: true })
  purpose: OtpPurpose;

  @Prop({ required: true, select: false })
  otpHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: false })
  verified: boolean;

  // ───── Customer-registration fields (null for seller / password-reset) ─────
  @Prop({ type: String, trim: true, default: null })
  firstName: string | null;

  @Prop({ type: String, trim: true, default: null })
  lastName: string | null;

  @Prop({ type: String, select: false, default: null })
  passwordHash: string | null;

  // ───── Seller-registration fields (null for customer / password-reset) ─────
  @Prop({ type: String, trim: true, default: null })
  businessName: string | null;

  @Prop({ type: String, trim: true, default: null })
  contactPerson: string | null;

  @Prop({ type: String, trim: true, default: null })
  mobile: string | null;

  // Auto-managed timestamps — declared so TypeScript knows they exist.
  createdAt: Date;
  updatedAt: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

OtpSchema.index({ email: 1, purpose: 1 }, { unique: true });
OtpSchema.index({ expiresAt: 1 });
