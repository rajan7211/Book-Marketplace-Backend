import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../../../common/enums';

export type UserDocument = HydratedDocument<User>;

/**
 * Lean authentication identity. Role-specific data lives in
 * CustomerProfile / SellerProfile (1-1). Never embed profile fields here.
 */
@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  /** bcrypt hash — never selected by default */
  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ type: String, enum: Role, required: true, index: true })
  role: Role;

  @Prop({ default: true })
  isActive: boolean;

  /** bcrypt hash of the current refresh token (rotation/logout) — never selected */
  @Prop({ type: String, select: false, default: null })
  refreshTokenHash: string | null;

  @Prop({ type: Date, default: null })
  lastLoginAt: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Strip secrets if a document is ever serialized directly.
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const out = ret as unknown as Record<string, unknown>;
    delete out.passwordHash;
    delete out.refreshTokenHash;
    delete out.__v;
    return out;
  },
});
