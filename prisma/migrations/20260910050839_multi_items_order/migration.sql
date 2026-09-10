/*
  Warnings:

  - The values [delivering,delivered,out_of_stock,delivery_failed] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `orderId` on the `DeliveryAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `orderId` on the `GameKey` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `Order` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orderItemId]` on the table `GameKey` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orderItemId` to the `DeliveryAttempt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderItemStatus" AS ENUM ('pending', 'delivering', 'delivered', 'out_of_stock', 'delivery_failed', 'refunded');

-- CreateEnum
CREATE TYPE "MoneyRecordType" AS ENUM ('charge', 'refund');

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('created', 'paid', 'payment_failed', 'completed');
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'created';
COMMIT;

-- DropForeignKey
ALTER TABLE "DeliveryAttempt" DROP CONSTRAINT "DeliveryAttempt_orderId_fkey";

-- DropForeignKey
ALTER TABLE "GameKey" DROP CONSTRAINT "GameKey_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_sku_fkey";

-- DropIndex
DROP INDEX "DeliveryAttempt_orderId_idx";

-- DropIndex
DROP INDEX "GameKey_orderId_key";

-- DropIndex
DROP INDEX "GameKey_sku_orderId_idx";

-- AlterTable
ALTER TABLE "DeliveryAttempt" DROP COLUMN "orderId",
ADD COLUMN     "orderItemId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "GameKey" DROP COLUMN "orderId",
ADD COLUMN     "orderItemId" TEXT;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "amount",
DROP COLUMN "sku",
ADD COLUMN     "totalAmount" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "OrderItemStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyRecord" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "type" "MoneyRecordType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_status_idx" ON "OrderItem"("status");

-- CreateIndex
CREATE INDEX "MoneyRecord_orderId_idx" ON "MoneyRecord"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "MoneyRecord_orderItemId_type_key" ON "MoneyRecord"("orderItemId", "type");

-- CreateIndex
CREATE INDEX "DeliveryAttempt_orderItemId_idx" ON "DeliveryAttempt"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "GameKey_orderItemId_key" ON "GameKey"("orderItemId");

-- CreateIndex
CREATE INDEX "GameKey_sku_orderItemId_idx" ON "GameKey"("sku", "orderItemId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_sku_fkey" FOREIGN KEY ("sku") REFERENCES "Product"("sku") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameKey" ADD CONSTRAINT "GameKey_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyRecord" ADD CONSTRAINT "MoneyRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyRecord" ADD CONSTRAINT "MoneyRecord_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
