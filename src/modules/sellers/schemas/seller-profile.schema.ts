import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SellerStatus } from '../../../common/enums';

export type SellerProfileDocument = HydratedDocument<SellerProfile>;

@Schema({ timestamps: true, collection: 'seller_profiles' })
export class SellerProfile {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  businessName: string;

  @Prop({ required: true, trim: true })
  contactPerson: string;

  /**
   * Business contact email. May differ from User.email (which is the
   * login email). Always stored lowercase.
   */
  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  mobile: string;

  /**
   * Lifecycle state. Indexed because every SellerApprovedGuard call
   * queries this.
   */
  @Prop({
    type: String,
    enum: SellerStatus,
    default: SellerStatus.PENDING_APPROVAL,
    index: true,
  })
  status: SellerStatus;

  /** Set when status becomes APPROVED. */
  @Prop({ type: Date, default: null })
  approvedAt: Date | null;

  /** FK to User — the admin who approved or rejected. */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy: Types.ObjectId | null;

  /**
   * Set when an admin rejects. Shown to the seller so they know why.
   * Optional — admin might just say "REJECTED" without a reason.
   */
  @Prop({ type: String, trim: true, default: null })
  rejectionReason: string | null;
}

export const SellerProfileSchema = SchemaFactory.createForClass(SellerProfile);
