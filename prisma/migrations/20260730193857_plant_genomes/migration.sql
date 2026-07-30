-- CreateEnum
CREATE TYPE "PlantCrop" AS ENUM ('HEMP', 'POTATO', 'PUMPKIN', 'CORN', 'BERRY_RED', 'BERRY_BLUE', 'BERRY_YELLOW', 'BERRY_WHITE');

-- CreateTable
CREATE TABLE "PlantGenome" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "crop" "PlantCrop" NOT NULL,
    "genes" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlantGenome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlantGenome_userId_crop_idx" ON "PlantGenome"("userId", "crop");

-- AddForeignKey
ALTER TABLE "PlantGenome" ADD CONSTRAINT "PlantGenome_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

