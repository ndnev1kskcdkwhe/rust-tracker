-- CreateTable
CREATE TABLE "PlayerViewHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "steamId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerViewHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapViewHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "seed" INTEGER NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MapViewHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerViewHistory_userId_viewedAt_idx" ON "PlayerViewHistory"("userId", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerViewHistory_userId_steamId_key" ON "PlayerViewHistory"("userId", "steamId");

-- CreateIndex
CREATE INDEX "MapViewHistory_userId_viewedAt_idx" ON "MapViewHistory"("userId", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MapViewHistory_userId_size_seed_key" ON "MapViewHistory"("userId", "size", "seed");

-- AddForeignKey
ALTER TABLE "PlayerViewHistory" ADD CONSTRAINT "PlayerViewHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapViewHistory" ADD CONSTRAINT "MapViewHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

