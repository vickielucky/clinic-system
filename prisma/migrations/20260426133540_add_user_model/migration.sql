/*
  Warnings:

  - Added the required column `inventoryId` to the `Dispense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientName` to the `Dispense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Drug` table without a default value. This is not possible if the table is not empty.
  - Added the required column `batchNumber` to the `Inventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Inventory` table without a default value. This is not possible if the table is not empty.
  - Made the column `expiryDate` on table `Inventory` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Dispense" ADD COLUMN     "dispensedBy" TEXT NOT NULL DEFAULT 'Admin',
ADD COLUMN     "inventoryId" INTEGER NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "patientName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Drug" ADD COLUMN     "reorderLevel" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "batchNumber" TEXT NOT NULL,
ADD COLUMN     "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "supplier" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "expiryDate" SET NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Pharmacist',
    "email" TEXT,
    "phone" TEXT,
    "licenseNo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Inventory_drugId_expiryDate_idx" ON "Inventory"("drugId", "expiryDate");

-- AddForeignKey
ALTER TABLE "Dispense" ADD CONSTRAINT "Dispense_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
