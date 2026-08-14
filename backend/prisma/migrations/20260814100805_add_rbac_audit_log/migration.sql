/*
  Warnings:

  - The values [ASSIGNED] on the enum `ProductKeyStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `isActive` on the `colleges` table. All the data in the column will be lost.
  - You are about to drop the column `assignedAt` on the `product_keys` table. All the data in the column will be lost.
  - You are about to drop the column `assignedToUserId` on the `product_keys` table. All the data in the column will be lost.
  - You are about to drop the column `keyString` on the `product_keys` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `products` table. All the data in the column will be lost.
  - The `status` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `progress` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `colleges` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[key]` on the table `product_keys` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `key` to the `product_keys` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "AccessStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED');

-- AlterEnum
BEGIN;
CREATE TYPE "ProductKeyStatus_new" AS ENUM ('UNUSED', 'ACTIVE', 'EXPIRED', 'REVOKED', 'EXHAUSTED');
ALTER TABLE "product_keys" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "product_keys" ALTER COLUMN "status" TYPE "ProductKeyStatus_new" USING ("status"::text::"ProductKeyStatus_new");
ALTER TYPE "ProductKeyStatus" RENAME TO "ProductKeyStatus_old";
ALTER TYPE "ProductKeyStatus_new" RENAME TO "ProductKeyStatus";
DROP TYPE "ProductKeyStatus_old";
ALTER TABLE "product_keys" ALTER COLUMN "status" SET DEFAULT 'UNUSED';
COMMIT;

-- DropForeignKey
ALTER TABLE "product_keys" DROP CONSTRAINT "product_keys_assignedToUserId_fkey";

-- DropForeignKey
ALTER TABLE "progress" DROP CONSTRAINT "progress_productId_fkey";

-- DropForeignKey
ALTER TABLE "progress" DROP CONSTRAINT "progress_userId_fkey";

-- DropIndex
DROP INDEX "product_keys_assignedToUserId_idx";

-- DropIndex
DROP INDEX "product_keys_keyString_key";

-- AlterTable
ALTER TABLE "colleges" DROP COLUMN "isActive",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "product_keys" DROP COLUMN "assignedAt",
DROP COLUMN "assignedToUserId",
DROP COLUMN "keyString",
ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "activatedByUserId" TEXT,
ADD COLUMN     "activationsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "key" TEXT NOT NULL,
ADD COLUMN     "maxActivations" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "isActive",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "version" TEXT NOT NULL DEFAULT '1.0.0';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletedAt" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';

-- DropTable
DROP TABLE "progress";

-- DropEnum
DROP TYPE "UserStatus";

-- CreateTable
CREATE TABLE "user_product_access" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productKeyId" TEXT,
    "status" "AccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_product_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "college_product_licenses" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "totalSeats" INTEGER NOT NULL,
    "usedSeats" INTEGER NOT NULL DEFAULT 0,
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "college_product_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "actorRole" "Role" NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_product_access_userId_idx" ON "user_product_access"("userId");

-- CreateIndex
CREATE INDEX "user_product_access_productId_idx" ON "user_product_access"("productId");

-- CreateIndex
CREATE INDEX "user_product_access_productKeyId_idx" ON "user_product_access"("productKeyId");

-- CreateIndex
CREATE INDEX "user_product_access_status_idx" ON "user_product_access"("status");

-- CreateIndex
CREATE INDEX "user_product_access_expiresAt_idx" ON "user_product_access"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_product_access_userId_productId_key" ON "user_product_access"("userId", "productId");

-- CreateIndex
CREATE INDEX "college_product_licenses_collegeId_idx" ON "college_product_licenses"("collegeId");

-- CreateIndex
CREATE INDEX "college_product_licenses_productId_idx" ON "college_product_licenses"("productId");

-- CreateIndex
CREATE INDEX "college_product_licenses_status_idx" ON "college_product_licenses"("status");

-- CreateIndex
CREATE UNIQUE INDEX "college_product_licenses_collegeId_productId_key" ON "college_product_licenses"("collegeId", "productId");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_targetType_targetId_idx" ON "audit_logs"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "colleges_email_key" ON "colleges"("email");

-- CreateIndex
CREATE INDEX "colleges_status_idx" ON "colleges"("status");

-- CreateIndex
CREATE INDEX "colleges_deletedAt_idx" ON "colleges"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_keys_key_key" ON "product_keys"("key");

-- CreateIndex
CREATE INDEX "product_keys_status_idx" ON "product_keys"("status");

-- CreateIndex
CREATE INDEX "product_keys_expiresAt_idx" ON "product_keys"("expiresAt");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "products_deletedAt_idx" ON "products"("deletedAt");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- AddForeignKey
ALTER TABLE "product_keys" ADD CONSTRAINT "product_keys_activatedByUserId_fkey" FOREIGN KEY ("activatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_product_access" ADD CONSTRAINT "user_product_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_product_access" ADD CONSTRAINT "user_product_access_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_product_access" ADD CONSTRAINT "user_product_access_productKeyId_fkey" FOREIGN KEY ("productKeyId") REFERENCES "product_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "college_product_licenses" ADD CONSTRAINT "college_product_licenses_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "college_product_licenses" ADD CONSTRAINT "college_product_licenses_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
