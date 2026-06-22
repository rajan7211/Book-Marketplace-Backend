import { Module } from '@nestjs/common';
import { SellersModule } from '../sellers/sellers.module';
import { CustomersModule } from '../customers/customers.module';
import { AdminController } from './admin.controller';

/**
 * Admin orchestration module — owns no data, delegates to feature services.
 * Extended with dashboard analytics + reports in Phase 12.
 */
@Module({
  imports: [SellersModule, CustomersModule],
  controllers: [AdminController],
})
export class AdminModule {}
