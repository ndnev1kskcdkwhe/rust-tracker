-- CreateTable
CREATE TABLE "ServerCache" (
    "query" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerCache_pkey" PRIMARY KEY ("query")
);

-- CreateTable
CREATE TABLE "MapCache" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MapCache_pkey" PRIMARY KEY ("key")
);

