-- AlterTable
ALTER TABLE "Project" ADD COLUMN "subdomain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Project_subdomain_key" ON "Project"("subdomain");
