import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PrismaOrmTX = PrismaService | Prisma.TransactionClient;

@Injectable()
export class GameKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async findKeyByOrderItemId(
    orderItemId: string,
    tx?: PrismaOrmTX,
  ): Promise<string | null> {
    const client = tx ?? this.prisma;

    const gameKey = await client.gameKey.findUnique({ where: { orderItemId } });

    return gameKey?.code ?? null;
  }

  async reserveKey(sku: string, orderItemId: string): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.$queryRaw<{ code: string }[]>(
        Prisma.sql`
          UPDATE "GameKey"
          SET "orderItemId" = ${orderItemId}, "reservedAt" = now()
          WHERE id = (
            SELECT id FROM "GameKey"
            WHERE sku = ${sku} AND "orderItemId" IS NULL
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

  async codeToItem(
    code: string,
    orderItemId: string,
  ): Promise<{ ok: boolean; conflict?: boolean }> {
    try {
      await this.prisma.gameKey.update({
        where: { code, orderItemId: null },
        data: { orderItemId, reservedAt: new Date() },
      });

      return { ok: true };
    } catch {
      return { ok: false, conflict: true };
    }
  }
}
