<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Запуск в Docker

```bash
docker compose up --build
```

```bash
docker compose down -v
docker compose up --build
```

## Запуск локально

Требуется Node.js 20.x

```bash
npm install
cp .env.example .env # Исправить локально
npx prisma migrate dev
npx prisma generate
npx prisma db seed
npm run start:dev
```

## API

- `POST` `/orders` Создать заказ - принимает `{ items: [{ sku }, ...] `, несколько товаров в одном заказе
- `GET` `/orders/:id` Текущее состояние заказа
- `POST` `/webhook/payment` Вебхук оплаты
- `GET` `/products` Каталог с остатками
- `GET` `/reconciliation` Сводка сверки (оплачен/не выдан, выдан/не оплачен)
- `GET` `/reconciliation/money-check/:orderId` Проверка баланса конкретного заказа
- `GET` `/queue/status` Прогресс очереди доставки: в очереди / в обработке / выдано / провалено
- `GET` `/status-history/orders/:id?asOf=<ISO дата>` Состояние заказа и денег на произвольный момент прошлого
- `GET` `/status-history/total?from=<ISO>&to=<ISO>` Сумма списаний/возвратов за период

## Ключевые решения

**Идемпотентность вебхука.** Unique ограничение на `Payment.eventId` отбрасывает повтор события на уровне БД. `SELECT FOR UPDATE` на строке заказа внутри транзакции сериализует параллельные вебхуки по одному `order_id` - из 50 одновременных запросов статус реально обработает только первый.

**Денормализованный остаток (`Product.availableCount`).** Витрина - самый частый запрос, подсчёт через `JOIN`/`GROUP BY` по `GameKey` при каждом обращении плохо масштабируется при тысячах SKU. Счётчик обновляется атомарно вместе с резервированием ключа, витрина читает одну таблицу без агрегации.

**Резервирование через `FOR UPDATE SKIP LOCKED`**, не обычный `FOR UPDATE` - параллельные заказы на один SKU берут каждый свою свободную строку, не выстраиваясь в очередь.

**Сверка и восстановление.** Фоновая задача (раз в минуту) находит заказы, зависшие дольше часа, и повторно вызывает `deliver()`.

## Как бы масштабировали под нагрузку

- Очереди (BullMQ/RabbitMq/Kafka) для асинхронной обработки выдачи вместо синхронного вызова внутри запроса вебхука
- Кэш каталога перед `Product`

## Как воспроизвести тесты (Этап 1)

**Юнит-тесты** (Jest):

```bash
npm run test:providers
```

**Гонки** (50 параллельных вебхуков по одному заказу + повтор `event_id`) - запустить сервер, затем в отдельном терминале:

```bash
npx run test:race
```

## Затраченное время

Ушло около 12-14ч.

## Примеры запросов (curl)

**Каталог (с пагинацией):**

```bash
curl http://localhost:3000/products
```

**Создать заказ:**

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"sku": "GIFT-PSN-1000"}'
```

Ответ содержит `id` - используется дальше как `order_id`.

**Получить заказ по id:**

```bash
curl http://localhost:3000/orders/ORDER_ID
```

**Отправить вебхук оплаты:**

```bash
curl -X POST http://localhost:3000/webhook/payment \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "evt_test_1",
    "order_id": "ORDER_ID",
    "status": "paid",
    "amount": 1990,
    "currency": "RUB",
    "created_at": "2026-01-01T12:00:00Z"
  }'
```

**Сверка (расхождения оплата/выдача):**

```bash
curl http://localhost:3000/reconciliation/paid-not-delivered
curl http://localhost:3000/reconciliation/delivered-not-paid
```

**Проверка идемпотентности** - повторно отправить тот же вебхук с тем же `event_id`, статус/остаток не должны измениться:

```bash
curl -X POST http://localhost:3000/webhook/payment \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "evt_test_1",
    "order_id": "ORDER_ID",
    "status": "paid",
    "amount": 1990,
    "currency": "RUB",
    "created_at": "2026-01-01T12:00:00Z"
  }'
```

## Как воспроизвести тесты (Этап 2)

# Задача 1

Создать заказ из нескольких SKU, среди которых есть товар с исчерпанным остатком (проверить `GET /products` на `availableCount`), оплатить обычным вебхуком:

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [{"sku": "SKU_С_ОСТАТКОМ"}, {"sku": "SKU_БЕЗ_ОСТАТКА"}]}'
```

Оплатить заказ (`POST /webhook/payment`, как в первом этапе, подставив реальный `order_id`/`totalAmount`). Проверить результат:

```bash
curl http://localhost:3000/orders/<id>
curl http://localhost:3000/reconciliation/money-check/<id>
```

Ожидается: позиция с остатком - `delivered`, без остатка - `refunded`, заказ - `completed`, баланс `charged = delivered + refunded`.

# Задача 2

В `.env` временно поднять вероятности нечестности провайдера A:

```bash
PROVIDER_A_DISHONESTY_RATE=0.9
PROVIDER_A_LIE_ABOUT_ERROR_RATE=0.9
```

Перезапустить сервер, создать и оплатить несколько заказов подряд. В логах должны появиться строки `returned a code already assigner` (конфликт обнаружен и отклонён) и `lied about error` (провайдер соврал про отказ, но код найден через `checkStatus`). Проверить в БД (`DeliveryAttempt`) записи со `status: 'conflict'`, и что финальный `GameKey.code` для позиции - настоящий, не тот, что провайдер пытался подделать. Вернуть значения `.env` обратно после проверки.

## Как проверить, что деньги сходятся

Из бд.

Из истории:

```bash
curl "http://localhost:3000/status-history/total?from=<ISO>&to=<ISO>"
```

# Задача 3

Временно занизить `PROVIDER_RATE_LIMIT` в `.env`, создать всплеск заказов (10-20 подряд), оплатить все, наблюдать:

```bash
curl http://localhost:3000/queue/status
```

Прогресс должен расти постепенно, не мгновенно - подтверждает, что лимит реально соблюдается, а не просто заявлен.

# Задача 4

```bash
curl "http://localhost:3000/status-history/orders/<id>?asOf=<ISO дата>"
```

Запросить состояние на момент до создания заказа (`exists: false`), сразу после создания (`status: "created"`), после полной обработки (`status: "completed"`) - каждый снимок должен отражать реальное состояние именно на тот момент, не текущее.

## Затраченное время

Ушло около 8-10ч.
