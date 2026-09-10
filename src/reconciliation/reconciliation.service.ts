import { Injectable } from '@nestjs/common';
import { GameKey, OrderItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  async findPaidNotDelivired(): Promise<OrderItem[]> {
    return this.prisma.orderItem.findMany({
      where: {
        status: { notIn: ['delivered', 'refunded'] },
        order: { payments: { some: { status: 'paid' } } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findDeliveredNotPaid(): Promise<GameKey[]> {
    return this.prisma.gameKey.findMany({
      where: {
        orderItemId: { not: null },
        orderItem: { order: { payments: { none: { status: 'paid' } } } },
      },
      orderBy: { reservedAt: 'asc' },
    });
  }

  async findFrozenOrders() {
    return this.prisma.orderItem.findMany({
      where: {
        status: { in: ['delivering', 'out_of_stock', 'delivery_failed'] },
        updatedAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
      },
      select: { id: true, sku: true, status: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
    });
  }
}
