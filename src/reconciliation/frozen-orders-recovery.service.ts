import { Injectable, Logger } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeliveryQueueService } from '../delivery/delivery-queue.service';

@Injectable()
export class FrozenOrdersRecovery {
  private readonly logger = new Logger(FrozenOrdersRecovery.name);

  private isRunning = false;

  constructor(
    private readonly reconciliationService: ReconciliationService,
    private readonly deliveryQueueService: DeliveryQueueService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async recoverFrozenOrders() {
    if (this.isRunning) {
      this.logger.warn('The previous recovery has not been completed');

      return;
    }

    this.isRunning = true;

    try {
      const frozenItems = await this.reconciliationService.findFrozenOrders();

      if (frozenItems.length === 0) {
        return;
      }

      this.logger.log(`Count of frozen order items: ${frozenItems.length}`);

      for (const item of frozenItems) {
        await this.deliveryQueueService.push(item.id, item.sku, 1);
      }
    } finally {
      this.isRunning = false;
    }
  }
}
