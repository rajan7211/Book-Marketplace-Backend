import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  mailConfig,
  envValidationSchema,
} from './config';
import { LoggerModule } from './infra/logger/logger.module';
import { DatabaseModule } from './infra/database/database.module';
import { MailerModule } from './infra/mailer/mailer.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, mailConfig],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    LoggerModule,
    DatabaseModule,
    MailerModule,
    UsersModule,
    CustomersModule,
    SellersModule,
    AuthModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule {}
