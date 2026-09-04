import { Module } from '@nestjs/common';
import { GameKeysModule } from '../game-keys/game-keys.module';
import { DeliveryService } from './delivery.service';
import { ProviderAService } from './providers/provider-a.service';
import { ProviderBService } from './providers/provider-b.service';

@Module({
  imports: [GameKeysModule],
  providers: [DeliveryService, ProviderAService, ProviderBService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
