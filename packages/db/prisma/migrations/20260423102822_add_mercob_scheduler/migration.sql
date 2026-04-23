/*
  Warnings:

  - You are about to drop the column `buildCommand` on the `MercioFunction` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ScheduleKind" AS ENUM ('DAILY', 'WEEKLY', 'INTERVAL', 'ONCE', 'CRON');

-- CreateEnum
CREATE TYPE "JobRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'TIMEOUT');

-- AlterTable
ALTER TABLE "MercioFunction" DROP COLUMN "buildCommand";

-- CreateTable
CREATE TABLE "ScheduledJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "functionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "recurring" BOOLEAN NOT NULL DEFAULT true,
    "scheduleKind" "ScheduleKind" NOT NULL,
    "timeOfDay" TEXT,
    "daysOfWeek" INTEGER[],
    "intervalSec" INTEGER,
    "cronExpr" TEXT,
    "runAt" TIMESTAMP(3),
    "method" TEXT NOT NULL DEFAULT 'GET',
    "path" TEXT NOT NULL DEFAULT '/',
    "query" JSONB,
    "headers" JSONB,
    "body" TEXT,
    "maxRetries" INTEGER NOT NULL DEFAULT 0,
    "timeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" "JobRunStatus" NOT NULL DEFAULT 'QUEUED',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "httpStatus" INTEGER,
    "responseBody" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRunLog" (
    "id" BIGSERIAL NOT NULL,
    "runId" TEXT NOT NULL,
    "line" TEXT NOT NULL,
    "stream" TEXT NOT NULL DEFAULT 'stdout',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledJob_active_nextRunAt_idx" ON "ScheduledJob"("active", "nextRunAt");

-- CreateIndex
CREATE INDEX "ScheduledJob_userId_idx" ON "ScheduledJob"("userId");

-- CreateIndex
CREATE INDEX "JobRun_jobId_createdAt_idx" ON "JobRun"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "JobRunLog_runId_idx" ON "JobRunLog"("runId");

-- AddForeignKey
ALTER TABLE "ScheduledJob" ADD CONSTRAINT "ScheduledJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledJob" ADD CONSTRAINT "ScheduledJob_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "MercioFunction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ScheduledJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRunLog" ADD CONSTRAINT "JobRunLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "JobRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
