import { Role } from '../enums';

/** Signed into the access token. Kept small. */
export interface JwtPayload {
  sub: string; // user _id
  email: string;
  role: Role;
  customerId?: string;
  sellerId?: string;
  iat?: number;
  exp?: number;
}

/** Attached to req.user after JwtStrategy.validate(). */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
  customerId?: string;
  sellerId?: string;
}
