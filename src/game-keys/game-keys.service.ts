import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PrismaOrmTX = PrismaService | Prisma.TransactionClient;

@Injectable()
export class GameKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async findKeyByOrderId(
    orderId: string,
    tx?: PrismaOrmTX,
  ): Promise<string | null> {
    const client = tx ?? this.prisma;

    const gameKey = await client.gameKey.findUnique({ where: { orderId } });

    return gameKey?.code ?? null;
  }

  async reserveKey(sku: string, orderId: string): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.$queryRaw<{ code: string }[]>(
        Prisma.sql`
          UPDATE "GameKey"
          SET "orderId" = ${orderId}, "reservedAt" = now()
          WHERE id = (
            SELECT id FROM "GameKey"
            WHERE sku = ${sku} AND "orderId" IS NULL
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          )
          RETURNING code;
        `,
      );

      const code = result[0]?.code ?? null;

      if (code) {
        await tx.$executeRaw`
          UPDATE "Product" 
          SET "availableCount" = "availableCount" - 1 
          WHERE sku = ${sku};
        `;
      }

      return code;
    });
  }
}
