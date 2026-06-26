import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SellerProfile, SellerProfileSchema } from './schemas/seller-profile.schema';
import { SellersRepository } from './sellers.repository';
import { SellersService } from './sellers.service';
import { SellersController } from './sellers.controller';
import { SellerApprovedGuard } from '../../common/guards/seller-approved.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SellerProfile.name, schema: SellerProfileSchema },
    ]),
  ],
  controllers: [SellersController],
  providers: [SellersRepository, SellersService, SellerApprovedGuard],
  exports: [SellersRepository, SellersService, SellerApprovedGuard],
})
export class SellersModule {}
