-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('queued', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "DeliveryQueue" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "QueueStatus" NOT NULL DEFAULT 'queued',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DeliveryQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryQueue_orderItemId_key" ON "DeliveryQueue"("orderItemId");

-- CreateIndex
CREATE INDEX "DeliveryQueue_status_priority_createdAt_idx" ON "DeliveryQueue"("status", "priority", "createdAt");

-- AddForeignKey
ALTER TABLE "DeliveryQueue" ADD CONSTRAINT "DeliveryQueue_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
