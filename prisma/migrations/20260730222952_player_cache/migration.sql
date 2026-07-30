-- CreateTable
CREATE TABLE "PlayerCache" (
    "steamId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerCache_pkey" PRIMARY KEY ("steamId")
);

