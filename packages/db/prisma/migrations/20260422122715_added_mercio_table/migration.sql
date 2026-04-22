-- CreateEnum
CREATE TYPE "MercioStatus" AS ENUM ('QUEUED', 'BUILDING', 'DEPLOYED', 'FAILED');

-- CreateTable
CREATE TABLE "MercioFunction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "buildCommand" TEXT,
    "entry" TEXT NOT NULL DEFAULT 'index.js',
    "status" "MercioStatus" NOT NULL DEFAULT 'QUEUED',
    "bundleKey" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MercioFunction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MercioFunction_userId_idx" ON "MercioFunction"("userId");

-- AddForeignKey
ALTER TABLE "MercioFunction" ADD CONSTRAINT "MercioFunction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
