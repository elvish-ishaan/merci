-- CreateTable
CREATE TABLE "SandboxApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "SandboxApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SandboxApiKey_keyHash_key" ON "SandboxApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "SandboxApiKey_userId_idx" ON "SandboxApiKey"("userId");

-- AddForeignKey
ALTER TABLE "SandboxApiKey" ADD CONSTRAINT "SandboxApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
