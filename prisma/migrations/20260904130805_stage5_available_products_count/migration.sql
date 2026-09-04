-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "availableCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Product_availableCount_idx" ON "Product"("availableCount");
