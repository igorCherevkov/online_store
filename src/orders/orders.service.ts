import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
  ) {}

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('order not found');
    }

    return order;
  }

  async create(sku: string) {
    const product = await this.products.findBySku(sku);
    if (!product) {
      throw new NotFoundException('product not found');
    }

    return this.prisma.order.create({
      data: {
        sku: product.sku,
        amount: product.price,
        currency: product.currency,
      },
    });
  }
}
