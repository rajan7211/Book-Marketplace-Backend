import { Role } from '../enums/role.enum';
import { BaseEntity } from './base.interface';

export interface UserResponse extends BaseEntity {
  email: string;
  role: Role;
}

export interface ProfileResponse {
  userId: string;
  email: string;
  role: Role;
  name?: string;
  customerId?: string;
  sellerId?: string;
  sellerStatus?: string;
}
