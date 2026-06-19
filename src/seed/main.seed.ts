import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { Role } from '../common/enums/role.enum';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Seed');
  const app = await NestFactory.create(AppModule);
  const usersService = app.get(UsersService);

  try {
    const existingAdmin = await usersService.findByEmail('admin@worldknowledge.com').catch(() => null);
    if (!existingAdmin) {
      await usersService.create({
        email: 'admin@worldknowledge.com',
        password: 'Admin@123',
        role: Role.ADMIN,
      });
      logger.log('Admin user seeded successfully.');
    } else {
      logger.log('Admin user already exists. Skipping.');
    }

    logger.log('Seed completed successfully.');
  } catch (error) {
    logger.error('Seed failed:', error.message);
  } finally {
    await app.close();
  }
}

bootstrap();
