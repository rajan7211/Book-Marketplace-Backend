import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Listing, ListingSchema } from './schemas/listing.schema';
import { ListingsService } from './listings.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Listing.name, schema: ListingSchema }])],
  providers: [ListingsService],
  exports: [ListingsService, MongooseModule],
})
export class ListingsModule {}
