import { Types } from 'mongoose';

export interface BaseEntity {
  id: string;
  _id?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Timestampable {
  createdAt: Date;
  updatedAt: Date;
}
