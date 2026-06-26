import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { SellersModule } from '../sellers/sellers.module';

/**
 * Admin orchestration module.
 * Owns NO data — delegates to feature services.
 *
 * Phase 4: only seller approve/reject.
 * Phase 11: dashboard analytics, book approve/reject, categories, reports.
 */
@Module({
  imports: [SellersModule],
  controllers: [AdminController],
})
export class AdminModule {}
