import { Injectable } from '@nestjs/common';
import { GameKey, Order } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  async findPaidNotDelivired(): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: {
        status: { not: 'delivered' },
        payments: { some: { status: 'paid' } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findDeliveredNotPaid(): Promise<GameKey[]> {
    return this.prisma.gameKey.findMany({
      where: {
        orderId: { not: null },
        order: { payments: { none: { status: 'paid' } } },
      },
      orderBy: { reservedAt: 'asc' },
    });
  }

  async findFrozenOrders() {
    return this.prisma.order.findMany({
      where: {
        status: { in: ['delivering', 'out_of_stock', 'delivery_failed'] },
        updatedAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
      },
      select: { id: true, sku: true, status: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
    });
  }
}
