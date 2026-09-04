import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildResult, normalizePagination } from '../utils/pagination/types';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async find(page?: number, limit?: number) {
    const {
      page: safePage,
      limit: safeLimit,
      skip,
    } = normalizePagination(page, limit);

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        skip,
        take: safeLimit,
        orderBy: { sku: 'asc' },
      }),

      this.prisma.product.count(),
    ]);

    return buildResult(items, total, safePage, safeLimit);
  }

  async findBySku(sku: string) {
    const product = await this.prisma.product.findUnique({ where: { sku } });
    if (!product) {
      throw new NotFoundException('product not found');
    }

    return product;
  }
}
