import { DeliveryService } from '../../src/delivery/delivery.service';

describe('DeliveryService', () => {
  const setupService = (
    overrides: {
      existingCode?: string | null;
      providerAImpl?: jest.Mock;
      providerBImpl?: jest.Mock;
    } = {},
  ) => {
    const prisma = {
      order: { update: jest.fn().mockResolvedValue({}) },
      deliveryAttempt: { create: jest.fn().mockResolvedValue({}) },
    } as any;

    const gameKeys = {
      findKeyByOrderId: jest
        .fn()
        .mockResolvedValue(overrides.existingCode ?? null),
    } as any;

    const providerA = {
      name: 'A',
      request: overrides.providerAImpl ?? jest.fn(),
    } as any;
    const providerB = {
      name: 'B',
      request: overrides.providerBImpl ?? jest.fn(),
    } as any;

    const service = new DeliveryService(prisma, gameKeys, providerA, providerB);

    return { service, prisma, gameKeys, providerA, providerB };
  };

  it('если ключ уже закреплён за заказом - не идёт к провайдерам вообще', async () => {
    const { service, providerA, providerB, prisma } = setupService({
      existingCode: 'ALREADY-HAVE',
    });

    await service.deliver('ord_1', 'SKU');

    expect(providerA.request).not.toHaveBeenCalled();
    expect(providerB.request).not.toHaveBeenCalled();
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 'ord_1' },
      data: { status: 'delivered' },
    });
  });

  it('провайдер A прошёл с первой попытки - B не используется', async () => {
    const providerAImpl = jest
      .fn()
      .mockResolvedValue({ status: 'ok', request_id: 'req', code: 'CODE-A' });
    const { service, providerB, prisma } = setupService({ providerAImpl });

    await service.deliver('ord_2', 'SKU');

    expect(providerB.request).not.toHaveBeenCalled();
    expect(prisma.order.update).toHaveBeenLastCalledWith({
      where: { id: 'ord_2' },
      data: { status: 'delivered' },
    });
  });

  it('provider A failed все попытки -> fallback на B, requestId у A не меняется между ретраями', async () => {
    const providerAImpl = jest
      .fn()
      .mockResolvedValue({ status: 'error', message: 'fail' });
    const providerBImpl = jest
      .fn()
      .mockResolvedValue({ status: 'ok', request_id: 'req', code: 'CODE-B' });
    const { service, prisma } = setupService({ providerAImpl, providerBImpl });

    await service.deliver('ord_3', 'SKU');

    expect(providerAImpl).toHaveBeenCalledTimes(5);
    const requestIdsUsedByA = providerAImpl.mock.calls.map(
      (call) => call[0].request_id,
    );
    expect(new Set(requestIdsUsedByA).size).toBe(1);

    expect(providerBImpl).toHaveBeenCalledTimes(1);
    expect(prisma.order.update).toHaveBeenLastCalledWith({
      where: { id: 'ord_3' },
      data: { status: 'delivered' },
    });
  }, 10000);

  it('оба провайдера failed (обычная ошибка, не out_of_stock) -> order уходит в delivery_failed', async () => {
    const providerAImpl = jest
      .fn()
      .mockResolvedValue({ status: 'error', message: 'fail' });
    const providerBImpl = jest
      .fn()
      .mockResolvedValue({ status: 'error', message: 'fail' });
    const { service, prisma } = setupService({ providerAImpl, providerBImpl });

    await service.deliver('ord_4', 'SKU');

    expect(prisma.order.update).toHaveBeenLastCalledWith({
      where: { id: 'ord_4' },
      data: { status: 'delivery_failed' },
    });
  }, 15000);

  it('каждая попытка фиксируется через deliveryAttempt.create с уникальным requestId и attemptNumber', async () => {
    const providerAImpl = jest
      .fn()
      .mockResolvedValue({ status: 'ok', request_id: 'req', code: 'CODE-A' });
    const { service, prisma } = setupService({ providerAImpl });

    await service.deliver('ord_5', 'SKU');

    expect(prisma.deliveryAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requestId: 'req_ord_5_A',
          attemptNumber: 1,
        }),
      }),
    );
  });

  it('provder A возвращает out_of_stock -> сразу out_of_stock, без ретраев и без fallback на B', async () => {
    const providerAImpl = jest.fn().mockResolvedValue({
      status: 'error',
      message: 'out_of_stock',
      reason: 'out_of_stock',
    });
    const providerBImpl = jest.fn();
    const { service, prisma } = setupService({ providerAImpl, providerBImpl });

    await service.deliver('ord_6', 'SKU');

    expect(providerAImpl).toHaveBeenCalledTimes(1);
    expect(providerBImpl).not.toHaveBeenCalled();
    expect(prisma.order.update).toHaveBeenLastCalledWith({
      where: { id: 'ord_6' },
      data: { status: 'out_of_stock' },
    });
  });
});
