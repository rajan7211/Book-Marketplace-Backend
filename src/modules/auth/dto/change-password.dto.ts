import { ApiProperty } from '@nestjs/swagger';

/**
 * Body for PATCH /auth/change-password.
 * Requires authentication (JWT).
 */
export class ChangePasswordDto {
  @ApiProperty({ example: 'OldSecret@123' })
  currentPassword: string;

  @ApiProperty({ example: 'NewSecret@456', minLength: 6 })
  newPassword: string;
}
