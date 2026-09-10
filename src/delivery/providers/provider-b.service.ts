import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeliveryProvider,
  ProviderRequest,
  ProviderResponse,
} from './prodiver.types';
import { GameKeysService } from '../../game-keys/game-keys.service';

@Injectable()
export class ProviderBService implements DeliveryProvider {
  readonly name = 'B';
  private readonly logger = new Logger(ProviderBService.name);

  private readonly issuedKeys = new Map<string, string>();

  private readonly failRate: number;
  private readonly timeoutRate: number;

  private readonly truthRate: number;
  private readonly lieErrorRate: number;

  constructor(
    private readonly gameKeys: GameKeysService,
    private readonly config: ConfigService,
  ) {
    this.failRate = Number(this.config.get('PROVIDER_B_FAIL_RATE') ?? 0.1);
    this.timeoutRate = Number(
      this.config.get('PROVIDER_B_TIMEOUT_RATE') ?? 0.1,
    );
    this.truthRate = Number(this.config.get('PROVIDER_B_TRUTH_RATE') ?? 0.1);
    this.lieErrorRate = Number(
      this.config.get('PROVIDER_B_LIE_ERROR_RATE') ?? 0.1,
    );
  }

  async request(req: ProviderRequest): Promise<ProviderResponse> {
    const existing = this.issuedKeys.get(req.request_id);
    if (existing) {
      return { status: 'ok', request_id: req.request_id, code: existing };
    }

    const rollNumber = Math.random();

    // internal error
    if (rollNumber < this.failRate) {
      if (Math.random() < this.lieErrorRate) {
        const code = await this.gameKeys.reserveKey(req.sku, req.order_id);

        if (code) {
          this.issuedKeys.set(req.request_id, code);

          this.logger.warn(`[provider B] lie about error: ${req.request_id}`);
        }
      }

      return { status: 'error', message: 'provider_b_internal_error' };
    }

    const isTimeout = rollNumber < this.failRate + this.timeoutRate;

    let code = await this.gameKeys.reserveKey(req.sku, req.order_id);
    if (!code) {
      return {
        status: 'error',
        message: 'out_of_stock',
        reason: 'out_of_stock',
      };
    }

    if (Math.random() < this.truthRate && this.issuedKeys.size > 0) {
      const issuedCodes = [...this.issuedKeys.values()];
      const fakeCode =
        issuedCodes[Math.floor(Math.random() * issuedCodes.length)];

      this.logger.warn(
        `[provider b] returns FAKE code ${req.request_id}, ${fakeCode}`,
      );

      code = fakeCode;
    }

    this.issuedKeys.set(req.request_id, code);

    if (isTimeout) {
      this.logger.warn(`[provider B] timeout for ${req.request_id}`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    return {
      status: 'ok',
      request_id: req.request_id,
      code,
    };
  }

  async checkStatus(requestId: string): Promise<ProviderResponse> {
    const code = this.issuedKeys.get(requestId);

    if (code) {
      return { status: 'ok', request_id: requestId, code };
    }

    return { status: 'error', message: 'not_found' };
  }
}
