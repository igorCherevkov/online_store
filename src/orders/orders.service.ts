import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { StatusHistoryService } from '../status-history/status-history.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
    private readonly statusHistoryService: StatusHistoryService,
  ) {}

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('order not found');
    }

    return order;
  }

  async create(skus: string[]) {
    const items = await Promise.all(
      skus.map(async (sku) => {
        const product = await this.products.findBySku(sku);
        return {
          sku: product.sku,
          amount: product.price,
          currency: product.currency,
        };
      }),
    );

    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
    const currency = items[0].currency;

    const order = await this.prisma.order.create({
      data: {
        totalAmount,
        currency,
        items: { create: items },
      },
      include: { items: true },
    });

    await this.statusHistoryService.writeOrderStatus(order.id, null, 'created');

    for (const item of order.items) {
      await this.statusHistoryService.writeOrderItemStatus(
        item.id,
        null,
        'pending',
      );
    }

    return order;
  }
}
