import { PrismaClient } from '@prisma/client';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const SKU = 'GIFT-ROBLOX-800';

const prisma = new PrismaClient();

interface OrderResponse {
  id: string;
  sku: string;
  amount: number;
  currency: string;
}

const createOrder = async (): Promise<OrderResponse> => {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku: SKU }),
  });

  if (!res.ok) {
    throw new Error(`Error while creating order: ${res.status}`);
  }

  return res.json();
};

const sendWebhook = async (
  orderId: string,
  eventId: string,
  amount: number,
  currency: string,
) => {
  const res = fetch(`${BASE_URL}/webhook/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: eventId,
      order_id: orderId,
      status: 'paid',
      amount,
      currency,
      created_at: new Date().toISOString(),
    }),
  });
  return res;
};

const testConcurrentWebhooks = async () => {
  console.log(
    '\n=====Тест 1Ж несколько паралелльных вебхуков, один заказ=====',
  );

  const order = await createOrder();
  console.log(`Order created: ${order.id}`);

  const requests = [];

  for (let i = 0; i < 50; i++) {
    requests.push(
      sendWebhook(
        order.id,
        `evt_${order.id}${i}`,
        order.amount,
        order.currency,
      ),
    );
  }

  await Promise.all(requests);

  const finalOrder = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
  });
  const gameKeys = await prisma.gameKey.findMany({
    where: { orderId: order.id },
  });
  const payments = await prisma.payment.findMany({
    where: { orderId: order.id },
  });

  console.log(`Final order status: ${finalOrder.status}`);
  console.log(`Game Keys: ${gameKeys.length}`);
  console.log(`Payments: ${payments.length}`);

  const checks = [
    {
      name: 'Заказ delivered',
      pass: finalOrder.status === 'delivered',
    },
    { name: 'Ровно один ключ закреплён', pass: gameKeys.length === 1 },
    {
      name: `Payment записей = ${50}`,
      pass: payments.length === 50,
    },
  ];

  for (const check of checks) {
    console.log(
      `[Test 1] ${check.pass ? 'Test passed' : 'Test failed'} ${check.name}`,
    );
  }

  return order;
};

const testDuplicateEventId = async () => {
  console.log(
    '\n=====Тест 2: несколько паралелльных вебхуков, один заказ=====',
  );

  const order = await createOrder();
  console.log(`Order created: ${order.id}`);

  const eventId = `evt_${order.id}`;
  const firstWebhook = await sendWebhook(
    order.id,
    eventId,
    order.amount,
    order.currency,
  );
  console.log(`First webhook ${firstWebhook.status}`);

  const gameKeysAfterFirst = await prisma.gameKey.findMany({
    where: { orderId: order.id },
  });

  const secondWebhook = await sendWebhook(
    order.id,
    eventId,
    order.amount,
    order.currency,
  );
  console.log(`First webhook ${secondWebhook.status}`);

  const gameKeysAfterSecond = await prisma.gameKey.findMany({
    where: { orderId: order.id },
  });

  const payments = await prisma.payment.findMany({ where: { eventId } });

  console.log(`Game Keys after first webhook: ${gameKeysAfterFirst.length}`);
  console.log(`Game Keys after second webhook: ${gameKeysAfterSecond.length}`);
  console.log(`Payments (${eventId}): ${payments.length}`);

  const checks = [
    {
      name: 'После первого вебхука ключ закреплён',
      pass: gameKeysAfterFirst.length === 1,
    },
    {
      name: 'Повтор не создал второй ключ',
      pass: gameKeysAfterSecond.length === 1,
    },
    {
      name: 'Payment с этим event_id ровно одна запись',
      pass: payments.length === 1,
    },
  ];

  for (const check of checks) {
    console.log(
      `[Test 2] ${check.pass ? 'Test passed' : 'Test failed'} ${check.name}`,
    );
  }
};

const main = async () => {
  await testConcurrentWebhooks();
  await testDuplicateEventId();
};

main()
  .catch((error) => {
    console.error(`[Tests 1, 2] error: `, error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
