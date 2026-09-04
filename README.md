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

## Ключевые решения

**Идемпотентность вебхука.** Unique ограничение на `Payment.eventId` отбрасывает повтор события на уровне БД. `SELECT FOR UPDATE` на строке заказа внутри транзакции сериализует параллельные вебхуки по одному `order_id` - из 50 одновременных запросов статус реально обработает только первый.

**Денормализованный остаток (`Product.availableCount`).** Витрина - самый частый запрос, подсчёт через `JOIN`/`GROUP BY` по `GameKey` при каждом обращении плохо масштабируется при тысячах SKU. Счётчик обновляется атомарно вместе с резервированием ключа, витрина читает одну таблицу без агрегации.

**Резервирование через `FOR UPDATE SKIP LOCKED`**, не обычный `FOR UPDATE` - параллельные заказы на один SKU берут каждый свою свободную строку, не выстраиваясь в очередь.

**Сверка и восстановление.** Фоновая задача (раз в минуту) находит заказы, зависшие дольше часа, и повторно вызывает `deliver()`.

## Как бы масштабировали под нагрузку

- Очереди (BullMQ/RabbitMq/Kafka) для асинхронной обработки выдачи вместо синхронного вызова внутри запроса вебхука
- Кэш каталога перед `Product`

## Как воспроизвести тесты

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
