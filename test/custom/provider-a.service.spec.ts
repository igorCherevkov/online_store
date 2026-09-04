import { ProviderAService } from '../../src/delivery/providers/provider-a.service';
import { GameKeysService } from '../../src/game-keys/game-keys.service';

const fakeConfig = (values: Record<string, string | number>) => {
  return { get: (key: string) => values[key] } as any;
};

const fakeGameKeys = (reserveKeyImpl: jest.Mock) => {
  return { reserveKey: reserveKeyImpl } as unknown as GameKeysService;
};

describe('ProviderAService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('возвращает error, если math roll попадает в диапазон failRate', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.05);

    const reserveKey = jest.fn();
    const provider = new ProviderAService(
      fakeGameKeys(reserveKey),
      fakeConfig({ PROVIDER_A_FAIL_RATE: 0.1, PROVIDER_A_TIMEOUT_RATE: 0 }),
    );

    const result = await provider.request({
      request_id: 'req_1',
      sku: 'SKU',
      order_id: 'ord_1',
    });

    expect(result.status).toBe('error');
    expect(reserveKey).not.toHaveBeenCalled();
  });

  it('успешно выдаёт код, если math roll не попадает ни в fail, ни в timeout', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);

    const reserveKey = jest.fn().mockResolvedValue('CODE-123');

    const provider = new ProviderAService(
      fakeGameKeys(reserveKey),
      fakeConfig({ PROVIDER_A_FAIL_RATE: 0.1, PROVIDER_A_TIMEOUT_RATE: 0.1 }),
    );

    const result = await provider.request({
      request_id: 'req_2',
      sku: 'SKU',
      order_id: 'ord_2',
    });

    expect(result).toEqual({
      status: 'ok',
      request_id: 'req_2',
      code: 'CODE-123',
    });

    expect(reserveKey).toHaveBeenCalledWith('SKU', 'ord_2');
  });

  it('возвращает error out_of_stock, если нет ключей', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);

    const reserveKey = jest.fn().mockResolvedValue(null);

    const provider = new ProviderAService(
      fakeGameKeys(reserveKey),
      fakeConfig({ PROVIDER_A_FAIL_RATE: 0, PROVIDER_A_TIMEOUT_RATE: 0 }),
    );

    const result = await provider.request({
      request_id: 'req_3',
      sku: 'SKU',
      order_id: 'ord_3',
    });

    expect(result).toEqual({
      status: 'error',
      message: 'out_of_stock',
      reason: 'out_of_stock',
    });
  });

  it('таймаут: код резервируется до зависания, повтор с тем же request_id возвращает тот же код без повторного резервирования', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.15);

    const reserveKey = jest.fn().mockResolvedValue('CODE-456');
    const provider = new ProviderAService(
      fakeGameKeys(reserveKey),
      fakeConfig({ PROVIDER_A_FAIL_RATE: 0.1, PROVIDER_A_TIMEOUT_RATE: 0.5 }),
    );

    const req = { request_id: 'req_timeout', sku: 'SKU', order_id: 'ord_4' };

    const firstCallPromise = provider.request(req);
    await jest.advanceTimersByTimeAsync(5000);
    const firstResult = await firstCallPromise;

    expect(firstResult.status).toBe('ok');
    expect(reserveKey).toHaveBeenCalledTimes(1);

    const secondResult = await provider.request(req);

    expect(secondResult).toEqual({
      status: 'ok',
      request_id: 'req_timeout',
      code: 'CODE-456',
    });

    expect(reserveKey).toHaveBeenCalledTimes(1);
  });
});
