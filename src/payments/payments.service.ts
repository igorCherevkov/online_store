import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryService } from '../delivery/delivery.service';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { Prisma } from '@prisma/client';
import { DeliveryQueueService } from '../delivery/delivery-queue.service';

interface OrderRow {
  id: string;
  status: string;
  totalAmount: number;
  currency: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: DeliveryService,
    private readonly deliveryQueueService: DeliveryQueueService,
  ) {}

  async handleWebhook(dto: PaymentWebhookDto): Promise<{ status: string }> {
    const out = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<OrderRow[]>(
        Prisma.sql`SELECT id, status, "totalAmount", currency FROM "Order" WHERE id = ${dto.order_id} FOR UPDATE`,
      );
      const order = rows[0];

      if (!order) {
        this.logger.warn(`[webhook] order not found: ${dto.order_id}`);

        throw new NotFoundException(`Order ${dto.order_id} not found`);
      }

      try {
        await tx.payment.create({
          data: {
            eventId: dto.event_id,
            orderId: dto.order_id,
            status: dto.status,
            payload: dto as unknown as Prisma.InputJsonValue,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          this.logger.log(`[webhook] duplicate event_id: ${dto.event_id}`);

          return { shouldDeliver: false };
        }
        throw error;
      }

      if (order.status !== 'created') {
        this.logger.log(
          `[webhook] order: ${order.id}; in status ${order.status}`,
        );
        return { shouldDeliver: false as const };
      }

      if (dto.status === 'failed') {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'payment_failed' },
        });

        return { shouldDeliver: false };
      }

      await tx.moneyRecord.create({
        data: {
          orderId: order.id,
          type: 'charge',
          amount: order.totalAmount,
          currency: order.currency,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'paid' },
      });

      const items = await tx.orderItem.findMany({
        where: { orderId: order.id },
      });

      return { shouldDeliver: true, orderId: order.id, items };
    });

    if (out.shouldDeliver) {
      for (const item of out.items) {
        await this.deliveryQueueService.push(item.id, item.sku, 0);
      }
    }

    return { status: 'ok' };
  }
}
