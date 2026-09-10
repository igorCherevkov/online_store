import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(private readonly prisma: PrismaService) {}

  async refundItem(orderItemId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findUniqueOrThrow({
        where: { id: orderItemId },
      });

      if (item.status === 'refunded') {
        this.logger.log(`[refund] ${orderItemId} already refunded`);

        return;
      }

      try {
        await tx.moneyRecord.create({
          data: {
            orderId: item.orderId,
            orderItemId: item.id,
            type: 'refund',
            amount: item.amount,
            currency: item.currency,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          this.logger.log(`[refund] ${orderItemId} already refunded`);

          return;
        }

        throw error;
      }

      await tx.orderItem.update({
        where: { id: orderItemId },
        data: { status: 'refunded' },
      });

      this.logger.log(
        `[refund] ${orderItemId} refunded, amount=${item.amount}`,
      );
    });
  }
}
