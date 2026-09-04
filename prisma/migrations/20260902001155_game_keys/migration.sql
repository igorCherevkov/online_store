-- CreateTable
CREATE TABLE "GameKey" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "orderId" TEXT,

    CONSTRAINT "GameKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameKey_code_key" ON "GameKey"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GameKey_orderId_key" ON "GameKey"("orderId");

-- CreateIndex
CREATE INDEX "GameKey_sku_orderId_idx" ON "GameKey"("sku", "orderId");

-- AddForeignKey
ALTER TABLE "GameKey" ADD CONSTRAINT "GameKey_sku_fkey" FOREIGN KEY ("sku") REFERENCES "Product"("sku") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameKey" ADD CONSTRAINT "GameKey_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
