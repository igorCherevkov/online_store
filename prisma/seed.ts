import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ProductSeed {
  sku: string;
  name: string;
  type: string;
  price: number;
  currency: string;
  image: string;
}

interface GameKeySeed {
  sku: string;
  code: string;
}

const seedProducts = async () => {
  const filePath = path.join(__dirname, 'seed-data', 'products.json');
  const data = fs.readFileSync(filePath, 'utf-8');

  const { products } = JSON.parse(data) as { products: ProductSeed[] };

  for (const product of products) {
    const exists = await prisma.product.findUnique({
      where: { sku: product.sku },
    });
    if (exists) continue;

    await prisma.product.create({
      data: {
        sku: product.sku,
        name: product.name,
        type: product.type,
        price: product.price,
        currency: product.currency,
        image: product.image,
      },
    });
  }
};

const seedGameKeys = async () => {
  const filePath = path.join(__dirname, 'seed-data', 'game-keys.json');
  const data = fs.readFileSync(filePath, 'utf-8');

  const { gameKeys } = JSON.parse(data) as { gameKeys: GameKeySeed[] };

  for (const key of gameKeys) {
    const exists = await prisma.gameKey.findUnique({
      where: { code: key.code },
    });
    if (exists) continue;

    await prisma.$transaction([
      prisma.gameKey.create({
        data: {
          sku: key.sku,
          code: key.code,
        },
      }),

      prisma.product.update({
        where: { sku: key.sku },
        data: { availableCount: { increment: 1 } },
      }),
    ]);
  }
};

const main = async () => {
  await seedProducts();
  await seedGameKeys();
};

main()
  .catch((error) => {
    console.error('seed error: ', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
