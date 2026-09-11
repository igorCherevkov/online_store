import { Prisma } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type PrismaOrTx = PrismaService | Prisma.TransactionClient;

@Injectable()
export class StatusHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async writeOrderStatus(
    orderId: string,
    oldStatus: string | null,
    newStatus: string,
    tx?: PrismaOrTx,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    await client.statusEvent.create({
      data: { entityType: 'order', entityId: orderId, oldStatus, newStatus },
    });
  }

  async writeOrderItemStatus(
    orderItemId: string,
    oldStatus: string | null,
    newStatus: string,
    tx?: PrismaOrTx,
  ) {
    const client = tx ?? this.prisma;

    await client.statusEvent.create({
      data: {
        entityType: 'order_item',
        entityId: orderItemId,
        oldStatus,
        newStatus,
      },
    });
  }

  private async getStatusAsOf(
    entityType: 'order' | 'order_item',
    entityId: string,
    asOf: Date,
  ): Promise<string | null> {
    const event = await this.prisma.statusEvent.findFirst({
      where: { entityType, entityId, createdAt: { lte: asOf } },
      orderBy: { createdAt: 'desc' },
    });

    return event?.newStatus ?? null;
  }

  private async getMoneyStatusAsOf(orderId: string, asOf: Date) {
    const [charges, refunds] = await Promise.all([
      this.prisma.moneyRecord.aggregate({
        where: { orderId, type: 'charge', createdAt: { lte: asOf } },
        _sum: { amount: true },
      }),

      this.prisma.moneyRecord.aggregate({
        where: { orderId, type: 'refund', createdAt: { lte: asOf } },
        _sum: { amount: true },
      }),
    ]);

    return {
      charged: charges._sum.amount ?? 0,
      refunded: refunds._sum.amount ?? 0,
    };
  }

  async getOrderStateAsOf(orderId: string, asOf: Date) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const orderStatus = await this.getStatusAsOf('order', orderId, asOf);

    if (orderStatus === null) {
      return { orderId, existedAt: asOf.toISOString(), exists: false };
    }

    const items = await Promise.all(
      order.items.map(async (item) => ({
        id: item.id,
        sku: item.sku,
        amount: item.amount,
        status: await this.getStatusAsOf('order_item', item.id, asOf),
      })),
    );

    const money = await this.getMoneyStatusAsOf(orderId, asOf);

    return {
      orderId,
      asOf: asOf.toISOString(),
      exists: true,
      status: orderStatus,
      items: items.filter((i) => i.status !== null),
      money,
    };
  }

  async getPeriodTotals(from: Date, to: Date) {
    const [charges, refunds] = await Promise.all([
      this.prisma.moneyRecord.aggregate({
        where: { type: 'charge', createdAt: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: true,
      }),

      this.prisma.moneyRecord.aggregate({
        where: { type: 'refund', createdAt: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      totalCharged: charges._sum.amount ?? 0,
      chargeCount: charges._count,
      totalRefunded: refunds._sum.amount ?? 0,
      refundCount: refunds._count,
    };
  }
}
