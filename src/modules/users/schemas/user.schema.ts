import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../../../common/enums';

export type UserDocument = HydratedDocument<User>;

/**
 * Lean authentication identity.
 *
 * Rule: role-specific data lives in CustomerProfile / SellerProfile (1-1),
 * NOT here. This keeps User small, fast to query, and role-agnostic.
 *
 * "select: false" on sensitive fields means: even if you accidentally do
 *   UsersService.findById(id)
 * the passwordHash is NOT returned by default. You have to explicitly ask
 * for it with .select('+passwordHash'). Defense in depth.
 */
@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  /**
   * bcrypt hash — NEVER plain text.
   * "select: false" means find() won't return it unless you opt in.
   */
  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ type: String, enum: Role, required: true, index: true })
  role: Role;

  /** Admin can flip this to false to disable an account without deleting it. */
  @Prop({ default: true })
  isActive: boolean;

  /**
   * bcrypt hash of the CURRENT refresh token.
   * Used for refresh-token rotation: on every refresh we re-hash the new
   * token and replace this. If someone tries to reuse an old refresh token,
   * the hashes won't match → we revoke everything.
   */
  @Prop({ type: String, select: false, default: null })
  refreshTokenHash: string | null;

  /** Set every time the user logs in. Useful for "last seen" UI. */
  @Prop({ type: Date, default: null })
  lastLoginAt: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

/**
 * Belt-and-braces: if someone bypasses the "select: false" and serializes
 * a User document to JSON (e.g. res.json(user)), make absolutely sure the
 * secrets are gone.
 */
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
