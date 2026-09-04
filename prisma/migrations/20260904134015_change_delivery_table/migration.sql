/*
  Warnings:

  - A unique constraint covering the columns `[requestId,attemptNumber]` on the table `DeliveryAttempt` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `attemptNumber` to the `DeliveryAttempt` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "DeliveryAttempt_requestId_key";

-- AlterTable
ALTER TABLE "DeliveryAttempt" ADD COLUMN     "attemptNumber" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAttempt_requestId_attemptNumber_key" ON "DeliveryAttempt"("requestId", "attemptNumber");
