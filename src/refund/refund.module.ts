import { Module } from '@nestjs/common';
import { RefundService } from './refund.service';
import { StatusHistoryModule } from '../status-history/status-history.module';

@Module({
  imports: [StatusHistoryModule],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}
