import { Module } from '@nestjs/common';
import { GameKeysModule } from '../game-keys/game-keys.module';
import { DeliveryService } from './delivery.service';
import { ProviderAService } from './providers/provider-a.service';
import { ProviderBService } from './providers/provider-b.service';
import { RefundModule } from '../refund/refund.module';

@Module({
  imports: [GameKeysModule, RefundModule],
  providers: [DeliveryService, ProviderAService, ProviderBService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
