/**
 * Roles are stored as strings in MongoDB.
 * The frontend speaks numeric roleId (1/2/3) — we map at the API boundary only.
 */
export enum Role {
  CUSTOMER = 'CUSTOMER',
  SELLER = 'SELLER',
  ADMIN = 'ADMIN',
}

/** Frontend numeric roleId -> internal Role enum (db.json: 1=CUSTOMER, 2=SELLER, 3=ADMIN). */
export const ROLE_ID_TO_ROLE: Record<number, Role> = {
  1: Role.CUSTOMER,
  2: Role.SELLER,
  3: Role.ADMIN,
};

export const ROLE_TO_ROLE_ID: Record<Role, number> = {
  [Role.CUSTOMER]: 1,
  [Role.SELLER]: 2,
  [Role.ADMIN]: 3,
};
