import { Module } from '@nestjs/common';
import { DeliveryModule } from '../delivery/delivery.module';
import { PaymentController } from './payments.controller';
import { PaymentService } from './payments.service';

@Module({
  imports: [DeliveryModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
