-- CreateTable
CREATE TABLE "UsageDaily" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "dead" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UsageDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsageDaily_day_idx" ON "UsageDaily"("day");

-- CreateIndex
CREATE UNIQUE INDEX "UsageDaily_user_id_day_key" ON "UsageDaily"("user_id", "day");

-- AddForeignKey
ALTER TABLE "UsageDaily" ADD CONSTRAINT "UsageDaily_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
