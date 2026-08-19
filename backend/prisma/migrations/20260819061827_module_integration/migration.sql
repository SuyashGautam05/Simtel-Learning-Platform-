-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('IFRAME', 'NONE');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "entryPointUrl" TEXT,
ADD COLUMN     "integrationType" "IntegrationType" NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "module_simulation_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_simulation_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "module_simulation_states_userId_idx" ON "module_simulation_states"("userId");

-- CreateIndex
CREATE INDEX "module_simulation_states_productId_idx" ON "module_simulation_states"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "module_simulation_states_userId_productId_key" ON "module_simulation_states"("userId", "productId");

-- AddForeignKey
ALTER TABLE "module_simulation_states" ADD CONSTRAINT "module_simulation_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_simulation_states" ADD CONSTRAINT "module_simulation_states_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
