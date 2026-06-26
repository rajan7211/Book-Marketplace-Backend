import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CustomerProfileDocument = HydratedDocument<CustomerProfile>;

/**
 * 1-1 with User. Holds the customer-specific data:
 *   - firstName, lastName  → what we display ("Welcome, Rajan!")
 *   - phone                → optional, for SMS notifications later
 *
 * Note: there is NO password or email here.
 * Those live on User, accessed via the userId reference.
 *
 * Mirrors the frontend's `customers` collection in the original mock API.
 */
@Schema({ timestamps: true, collection: 'customer_profiles' })
export class CustomerProfile {
  /** FK to User. One customer profile per user (enforced by `unique`). */
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  /** Optional. Many users won't add this at registration. */
  @Prop({ type: String, trim: true, default: null })
  phone: string | null;
}

export const CustomerProfileSchema = SchemaFactory.createForClass(CustomerProfile);
