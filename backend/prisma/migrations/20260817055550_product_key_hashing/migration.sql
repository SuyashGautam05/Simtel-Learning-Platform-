/*
  Warnings:

  - You are about to drop the column `key` on the `product_keys` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[keyHash]` on the table `product_keys` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `keyHash` to the `product_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `keyLastFour` to the `product_keys` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "product_keys_key_key";

-- AlterTable
ALTER TABLE "product_keys" DROP COLUMN "key",
ADD COLUMN     "activationRules" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "keyHash" TEXT NOT NULL,
ADD COLUMN     "keyLastFour" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "product_keys_keyHash_key" ON "product_keys"("keyHash");

-- CreateIndex
CREATE INDEX "product_keys_keyLastFour_idx" ON "product_keys"("keyLastFour");
