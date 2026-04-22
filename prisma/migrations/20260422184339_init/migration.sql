-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('SERPAPI', 'KEEPA', 'BESTBUY', 'SCRAPER', 'CSV_IMPORT');

-- CreateEnum
CREATE TYPE "SentimentLabel" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "ScraperStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'laptop',
    "msrp" DOUBLE PRECISION NOT NULL,
    "isTarget" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Price" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "retailer" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "url" TEXT,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "PriceSource" NOT NULL DEFAULT 'SCRAPER',

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Benchmark" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "cinebenchR23Multi" DOUBLE PRECISION,
    "cinebenchR23Single" DOUBLE PRECISION,
    "geekbench6Multi" DOUBLE PRECISION,
    "geekbench6Single" DOUBLE PRECISION,
    "timespy" DOUBLE PRECISION,
    "firestrike" DOUBLE PRECISION,
    "blender" DOUBLE PRECISION,
    "thermalTjMax" DOUBLE PRECISION,
    "fanNoiseDb" DOUBLE PRECISION,
    "batteryLifeHrs" DOUBLE PRECISION,
    "aggregateScore" DOUBLE PRECISION,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Benchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "url" TEXT,
    "reviewerName" TEXT,
    "rating" DOUBLE PRECISION,
    "title" TEXT,
    "body" TEXT,
    "sentimentScore" DOUBLE PRECISION,
    "sentimentLabel" "SentimentLabel",
    "positiveCount" INTEGER NOT NULL DEFAULT 0,
    "negativeCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesData" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "retailer" TEXT,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "unitsSold" INTEGER NOT NULL,
    "revenue" DOUBLE PRECISION,
    "avgSellingPrice" DOUBLE PRECISION,
    "returnRate" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'csv_import',
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScraperRun" (
    "id" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "status" "ScraperStatus" NOT NULL,
    "productsUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ScraperRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronLog" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" JSONB,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_brand_model_idx" ON "Product"("brand", "model");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Price_productId_scrapedAt_idx" ON "Price"("productId", "scrapedAt");

-- CreateIndex
CREATE INDEX "Price_productId_retailer_idx" ON "Price"("productId", "retailer");

-- CreateIndex
CREATE INDEX "Benchmark_productId_idx" ON "Benchmark"("productId");

-- CreateIndex
CREATE INDEX "Review_productId_scrapedAt_idx" ON "Review"("productId", "scrapedAt");

-- CreateIndex
CREATE INDEX "Review_productId_source_idx" ON "Review"("productId", "source");

-- CreateIndex
CREATE INDEX "SalesData_productId_weekStartDate_idx" ON "SalesData"("productId", "weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "SalesData_productId_retailer_weekStartDate_key" ON "SalesData"("productId", "retailer", "weekStartDate");

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Benchmark" ADD CONSTRAINT "Benchmark_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesData" ADD CONSTRAINT "SalesData_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
