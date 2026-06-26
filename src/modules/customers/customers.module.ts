import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerProfile, CustomerProfileSchema } from './schemas/customer-profile.schema';
import { CustomersRepository } from './customers.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerProfile.name, schema: CustomerProfileSchema },
    ]),
  ],
  providers: [CustomersRepository],
  exports: [CustomersRepository],
})
export class CustomersModule {}
