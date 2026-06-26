import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../../modules/users/users.repository';
import { Role } from '../../common/enums';

/**
 * Seed an admin user on app startup.
 *
 * Behavior:
 *   - Reads ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD from env.
 *   - If BOTH are missing → logs "skipped" and exits (no-op).
 *   - If an admin user already exists with that email → log "already seeded" (no-op).
 *   - Otherwise → creates the user with role: ADMIN.
 *
 * Idempotent: safe to run on every boot.
 */
export async function seedAdmin(
  config: ConfigService,
  users: UsersRepository,
): Promise<void> {
  const logger = new Logger('AdminSeed');

  const email = config.get<string>('ADMIN_SEED_EMAIL');
  const password = config.get<string>('ADMIN_SEED_PASSWORD');

  if (!email || !password) {
    logger.log(
      '⏭  Skipped (set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD in .env to enable)',
    );
    return;
  }

  const existing = await users.findByEmail(email);
  if (existing) {
    if (existing.role === Role.ADMIN) {
      logger.log(`Admin already exists: ${email}`);
      return;
    }
    // Email is taken by a non-admin user. Don't overwrite.
    logger.warn(
      `Email ${email} already exists but is role=${existing.role}. Skipping seed.`,
    );
    return;
  }

  const saltRounds = config.get<number>('app.bcryptSaltRounds') ?? 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  await users.create({
    email,
    passwordHash,
    role: Role.ADMIN,
  });

  logger.log(' Admin user created!');
  logger.log(`    Email:    ${email}`);
  logger.log(`    Password: ${password}`);
  logger.log(`    (Copy these to your .env for future boots)`);
}
