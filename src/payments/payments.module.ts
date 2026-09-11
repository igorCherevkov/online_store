import { Module } from '@nestjs/common';
import { DeliveryModule } from '../delivery/delivery.module';
import { PaymentController } from './payments.controller';
import { PaymentService } from './payments.service';
import { StatusHistoryModule } from '../status-history/status-history.module';

@Module({
  imports: [DeliveryModule, StatusHistoryModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
