import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SellerStatus } from '../../../common/enums';

export type SellerProfileDocument = HydratedDocument<SellerProfile>;

/**
 * 1-1 with User. Mirrors frontend `sellers`.
 * Approval lifecycle: PENDING_APPROVAL -> APPROVED | REJECTED (admin-driven).
 */
@Schema({ timestamps: true, collection: 'seller_profiles' })
export class SellerProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  businessName: string;

  @Prop({ required: true, trim: true })
  contactPerson: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  mobile: string;

  @Prop({
    type: String,
    enum: SellerStatus,
    default: SellerStatus.PENDING_APPROVAL,
    index: true,
  })
  status: SellerStatus;

  @Prop({ type: Date, default: null })
  approvedAt: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  rejectionReason: string | null;
}

export const SellerProfileSchema = SchemaFactory.createForClass(SellerProfile);
