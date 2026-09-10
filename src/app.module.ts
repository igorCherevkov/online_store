import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { GameKeysModule } from './game-keys/game-keys.module';
import { PaymentModule } from './payments/payments.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { RefundModule } from './refund/refund.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    PrismaModule,

    ProductsModule,
    OrdersModule,
    GameKeysModule,
    PaymentModule,

    RefundModule,

    ReconciliationModule,
  ],
})
export class AppModule {}
