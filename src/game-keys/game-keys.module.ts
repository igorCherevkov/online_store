import { Module } from '@nestjs/common';
import { GameKeysService } from './game-keys.service';

@Module({ providers: [GameKeysService], exports: [GameKeysService] })
export class GameKeysModule {}
