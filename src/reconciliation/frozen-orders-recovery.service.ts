import { Injectable, Logger } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { DeliveryService } from '../delivery/delivery.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class FrozenOrdersRecovery {
  private readonly logger = new Logger(FrozenOrdersRecovery.name);

  private isRunning = false;

  constructor(
    private readonly reconciliationService: ReconciliationService,
    private readonly deliveryService: DeliveryService,
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
        try {
          this.logger.log(
            `Retry attempt: orderItem ${item.id}, status: ${item.status}`,
          );

          await this.deliveryService.deliver(item.id, item.sku);
        } catch (error) {
          this.logger.error(
            `Error while order recovery, orderItem ${item.id}, ${error}`,
          );
        }
      }
    } finally {
      this.isRunning = false;
    }
  }
}
