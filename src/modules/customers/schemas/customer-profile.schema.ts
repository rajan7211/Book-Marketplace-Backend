import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CustomerProfileDocument = HydratedDocument<CustomerProfile>;

/** 1-1 with User. Mirrors frontend `customers` (firstName/lastName). */
@Schema({ timestamps: true, collection: 'customer_profiles' })
export class CustomerProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ type: String, trim: true, default: null })
  phone: string | null;
}

export const CustomerProfileSchema = SchemaFactory.createForClass(CustomerProfile);


