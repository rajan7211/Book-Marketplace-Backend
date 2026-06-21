import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SellerProfile, SellerProfileSchema } from './schemas/seller-profile.schema';
import { SellersService } from './sellers.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SellerProfile.name, schema: SellerProfileSchema }]),
  ],
  providers: [SellersService],
  exports: [SellersService, MongooseModule],
})
export class SellersModule {}
