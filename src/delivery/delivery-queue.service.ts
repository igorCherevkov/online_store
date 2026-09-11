import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryService } from './delivery.service';
import { RateLimiterService } from './rate-limiter.service';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class DeliveryQueueService {
  private readonly logger = new Logger(DeliveryQueueService.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: DeliveryService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  async push(orderItemId: string, sku: string, priority = 0): Promise<void> {
    await this.prisma.deliveryQueue.upsert({
      where: { orderItemId },
      update: {},
      create: { orderItemId, sku, priority },
    });
  }

  @Interval(1000)
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    if (!this.rateLimiter.tryTake()) {
      return;
    }

    this.isProcessing = true;

    try {
      const orderToDelivery = await this.prisma.deliveryQueue.findFirst({
        where: { status: 'queued' },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      });

      if (!orderToDelivery) {
        return;
      }

      const claimed = await this.prisma.deliveryQueue.updateMany({
        where: { id: orderToDelivery.id, status: 'queued' },
        data: { status: 'processing', startedAt: new Date() },
      });

      if (claimed.count === 0) {
        return;
      }

      try {
        await this.delivery.deliver(
          orderToDelivery.orderItemId,
          orderToDelivery.sku,
        );

        await this.prisma.deliveryQueue.update({
          where: { id: orderToDelivery.id },
          data: { status: 'completed', completedAt: new Date() },
        });
      } catch (error) {
        this.logger.error(
          `Queue processing failed for ${orderToDelivery.id} with error: ${error}`,
        );

        await this.prisma.deliveryQueue.update({
          where: { id: orderToDelivery.id },
          data: { status: 'failed', completedAt: new Date() },
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  async getStatus() {
    const [queued, processing, completed, failed] = await Promise.all([
      this.prisma.deliveryQueue.count({ where: { status: 'queued' } }),
      this.prisma.deliveryQueue.count({ where: { status: 'processing' } }),
      this.prisma.deliveryQueue.count({ where: { status: 'completed' } }),
      this.prisma.deliveryQueue.count({ where: { status: 'failed' } }),
    ]);

    return {
      queued,
      processing,
      completed,
      failed,
      total: queued + processing + completed + failed,
      rateLimit: {
        available: this.rateLimiter.takeAvailable(),
      },
    };
  }
}
