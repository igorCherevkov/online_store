import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { GameKeysModule } from './game-keys/game-keys.module';
import { PaymentModule } from './payments/payments.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { RefundModule } from './refund/refund.module';
import { StatusHistoryModule } from './status-history/status-history.module';
import { DeliveryModule } from './delivery/delivery.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    PrismaModule,

    ProductsModule,
    OrdersModule,
    GameKeysModule,
    PaymentModule,
    DeliveryModule,

    RefundModule,
    StatusHistoryModule,

    ReconciliationModule,
  ],
})
export class AppModule {}
