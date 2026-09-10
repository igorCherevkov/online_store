import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameKeysService } from '../game-keys/game-keys.service';
import { DeliveryProvider, ProviderResponse } from './providers/prodiver.types';
import { ProviderAService } from './providers/provider-a.service';
import { ProviderBService } from './providers/provider-b.service';
import { RefundService } from '../refund/refund.service';

interface CallProvider {
  ok: boolean;
  code?: string;
  outOfStock?: boolean;
}

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  private readonly timeoutMs: number = 2000;
  private readonly maxRetries: number = 5;
  private readonly backOffMs: number = 500;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gameKeysService: GameKeysService,
    private readonly providerA: ProviderAService,
    private readonly providerB: ProviderBService,
    private readonly refundService: RefundService,
  ) {}

  async deliver(orderItemId: string, sku: string): Promise<void> {
    await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status: 'delivering' },
    });

    const existingCode =
      await this.gameKeysService.findKeyByOrderItemId(orderItemId);

    if (existingCode) {
      await this.prisma.orderItem.update({
        where: { id: orderItemId },
        data: { status: 'delivered' },
      });

      this.logger.log(`OrderItem ${orderItemId} already has a game key`);

      return;
    }

    let res = await this.callProvider(this.providerA, orderItemId, sku);
    if (!res.ok && !res.outOfStock) {
      this.logger.warn(`[provider A] error, order: ${orderItemId}`);

      res = await this.callProvider(this.providerB, orderItemId, sku);
    }

    const finalStatus = res.ok
      ? 'delivered'
      : res.outOfStock
        ? 'out_of_stock'
        : 'delivery_failed';

    await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status: finalStatus },
    });

    if (res.ok) {
      this.logger.log(`OrderItem ${orderItemId} delivered`);

      return;
    } else if (res.outOfStock) {
      this.logger.warn(`OrderItem ${orderItemId} out of stock, sku: ${sku}`);
    } else {
      this.logger.error(`Provider error, order ${orderItemId} not delivered`);
    }

    await this.refundService.refundItem(orderItemId);
  }

  private async callProvider(
    provider: DeliveryProvider,
    orderItemId: string,
    sku: string,
  ): Promise<CallProvider> {
    const requestId = `req_${orderItemId}_${provider.name}`;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const res = await this.callWithTimeout(provider, {
        request_id: requestId,
        sku,
        order_id: orderItemId,
      });

      const status = res.status;
      const code = res.status === 'ok' ? res.code : null;

      await this.prisma.deliveryAttempt.create({
        data: {
          requestId,
          attemptNumber: attempt,
          orderItemId,
          provider: provider.name,
          status,
          code,
        },
      });

      if (res.status === 'ok') {
        return { ok: true, code: res.code };
      }

      if (res.status === 'error' && res.reason === 'out_of_stock') {
        return { ok: false, outOfStock: true };
      }

      this.logger.warn(
        `Provider ${provider.name} attempt ${attempt}/${this.maxRetries}, requestId: ${requestId}`,
      );

      if (attempt < this.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, this.backOffMs));
      }
    }

    return { ok: false };
  }

  private async callWithTimeout(
    provider: DeliveryProvider,
    req: { request_id: string; sku: string; order_id: string },
  ): Promise<ProviderResponse | { status: 'timeout' }> {
    let timeoutId: NodeJS.Timeout;

    const timeout = new Promise<{ status: 'timeout' }>((resolve) => {
      timeoutId = setTimeout(
        () => resolve({ status: 'timeout' }),
        this.timeoutMs,
      );
    });

    try {
      return Promise.race([provider.request(req), timeout]);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
