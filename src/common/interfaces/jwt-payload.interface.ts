import { Role } from '../enums';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  customerId?: string;
  sellerId?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
  customerId?: string;
  sellerId?: string;
}
