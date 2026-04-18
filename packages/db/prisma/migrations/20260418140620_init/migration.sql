/*
  Warnings:

  - The values [UPLOADING] on the enum `ProjectStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[githubId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProjectStatus_new" AS ENUM ('QUEUED', 'CLONING', 'BUILDING', 'DEPLOYED', 'FAILED');
ALTER TABLE "public"."Project" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Project" ALTER COLUMN "status" TYPE "ProjectStatus_new" USING ("status"::text::"ProjectStatus_new");
ALTER TYPE "ProjectStatus" RENAME TO "ProjectStatus_old";
ALTER TYPE "ProjectStatus_new" RENAME TO "ProjectStatus";
DROP TYPE "public"."ProjectStatus_old";
ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'QUEUED';
COMMIT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "deployedUrl" TEXT,
ALTER COLUMN "status" SET DEFAULT 'QUEUED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "githubAccessToken" TEXT,
ADD COLUMN     "githubId" TEXT;

-- CreateTable
CREATE TABLE "BuildLog" (
    "id" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "line" TEXT NOT NULL,
    "stream" TEXT NOT NULL DEFAULT 'stdout',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvVar" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnvVar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BuildLog_projectId_idx" ON "BuildLog"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- AddForeignKey
ALTER TABLE "BuildLog" ADD CONSTRAINT "BuildLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvVar" ADD CONSTRAINT "EnvVar_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
