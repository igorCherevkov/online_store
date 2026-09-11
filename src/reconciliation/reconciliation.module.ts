import { Module } from '@nestjs/common';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';
import { ScheduleModule } from '@nestjs/schedule';
import { DeliveryModule } from '../delivery/delivery.module';
import { FrozenOrdersRecovery } from './frozen-orders-recovery.service';

@Module({
  imports: [ScheduleModule.forRoot(), DeliveryModule],
  controllers: [ReconciliationController],
  providers: [ReconciliationService, FrozenOrdersRecovery],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
