import { Module } from '@nestjs/common';
import { GameKeysModule } from '../game-keys/game-keys.module';
import { DeliveryService } from './delivery.service';
import { ProviderAService } from './providers/provider-a.service';
import { ProviderBService } from './providers/provider-b.service';
import { RefundModule } from '../refund/refund.module';
import { DeliveryQueueController } from './delivery-queue.controller';
import { RefundService } from '../refund/refund.service';
import { DeliveryQueueService } from './delivery-queue.service';
import { RateLimiterService } from './rate-limiter.service';
import { StatusHistoryModule } from '../status-history/status-history.module';

@Module({
  imports: [GameKeysModule, RefundModule, StatusHistoryModule],
  controllers: [DeliveryQueueController],
  providers: [
    DeliveryService,
    ProviderAService,
    ProviderBService,
    RefundService,
    DeliveryQueueService,
    RateLimiterService,
  ],
  exports: [DeliveryService, DeliveryQueueService],
})
export class DeliveryModule {}
