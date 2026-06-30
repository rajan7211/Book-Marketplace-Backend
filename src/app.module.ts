import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  mailConfig,
  envValidationSchema,
  cloudinaryConfig,
} from './config';
import { LoggerModule } from './infra/logger/logger.module';
import { DatabaseModule } from './infra/database/database.module';
import { MailerModule } from './infra/mailer/mailer.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BooksModule } from './modules/books/books.module';
import { HealthModule } from './modules/health/health.module';
import { ListingsModule } from './modules/listings/listings.module';
import { CartModule } from './modules/cart/cart.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { OrdersModule } from './modules/orders/orders.module';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, mailConfig,
        cloudinaryConfig],
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
    CategoriesModule,
    ListingsModule,
    UploadsModule,
    CartModule,
    WishlistModule,
    OrdersModule,
    BooksModule,
    HealthModule,
  ],
})
export class AppModule {}
