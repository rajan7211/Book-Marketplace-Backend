import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { Otp, OtpSchema } from './schemas/otp.schema';
import { OtpRepository } from './otp.repository';
import { OtpService } from './otp.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { UsersModule } from '../users/users.module';
import { CustomersModule } from '../customers/customers.module';
import { SellersModule } from '../sellers/sellers.module';
import { Cart, CartSchema } from '../cart/schemas/cart.schema';

@Module({
  imports: [
    UsersModule,
    CustomersModule,
    SellersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({}),
    }),
    MongooseModule.forFeature([
      { name: Otp.name, schema: OtpSchema },
      { name: Cart.name, schema: CartSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    OtpRepository,
    OtpService,
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    JwtRefreshGuard,
  ],
})
export class AuthModule {}
