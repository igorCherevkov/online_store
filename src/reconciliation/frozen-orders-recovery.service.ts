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
      const frozenOrders = await this.reconciliationService.findFrozenOrders();

      if (frozenOrders.length === 0) {
        return;
      }

      this.logger.log(`Count of frozen orders: ${frozenOrders.length}`);

      for (const order of frozenOrders) {
        try {
          this.logger.log(
            `Retry attempt: order ${order.id}, status: ${order.status}`,
          );

          await this.deliveryService.deliver(order.id, order.sku);
        } catch (error) {
          this.logger.error(
            `Error while order recovery, order ${order.id}, ${error}`,
          );
        }
      }
    } finally {
      this.isRunning = false;
    }
  }
}
