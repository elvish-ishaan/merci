-- CreateEnum
CREATE TYPE "CIStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'SKIPPED');

-- CreateTable
CREATE TABLE "ActionRepo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repoFullName" TEXT NOT NULL,
    "webhookId" INTEGER,
    "webhookSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionRepo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionSecret" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionRun" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "workflowFile" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "status" "CIStatus" NOT NULL DEFAULT 'QUEUED',
    "conclusion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ActionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionJob" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CIStatus" NOT NULL DEFAULT 'QUEUED',
    "conclusion" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ActionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionStep" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "CIStatus" NOT NULL DEFAULT 'QUEUED',
    "conclusion" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ActionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionLog" (
    "id" BIGSERIAL NOT NULL,
    "stepId" TEXT NOT NULL,
    "line" TEXT NOT NULL,
    "stream" TEXT NOT NULL DEFAULT 'stdout',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActionRepo_userId_idx" ON "ActionRepo"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ActionRepo_userId_repoFullName_key" ON "ActionRepo"("userId", "repoFullName");

-- CreateIndex
CREATE INDEX "ActionSecret_repoId_idx" ON "ActionSecret"("repoId");

-- CreateIndex
CREATE UNIQUE INDEX "ActionSecret_repoId_name_key" ON "ActionSecret"("repoId", "name");

-- CreateIndex
CREATE INDEX "ActionRun_repoId_createdAt_idx" ON "ActionRun"("repoId", "createdAt");

-- CreateIndex
CREATE INDEX "ActionJob_runId_idx" ON "ActionJob"("runId");

-- CreateIndex
CREATE INDEX "ActionStep_jobId_idx" ON "ActionStep"("jobId");

-- CreateIndex
CREATE INDEX "ActionLog_stepId_idx" ON "ActionLog"("stepId");

-- AddForeignKey
ALTER TABLE "ActionRepo" ADD CONSTRAINT "ActionRepo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionSecret" ADD CONSTRAINT "ActionSecret_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "ActionRepo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionRun" ADD CONSTRAINT "ActionRun_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "ActionRepo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionJob" ADD CONSTRAINT "ActionJob_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ActionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionStep" ADD CONSTRAINT "ActionStep_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ActionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ActionStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
