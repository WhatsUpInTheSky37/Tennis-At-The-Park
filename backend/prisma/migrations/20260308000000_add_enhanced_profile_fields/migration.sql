-- AlterTable
ALTER TABLE "profiles" ADD COLUMN "years_playing" INTEGER;
ALTER TABLE "profiles" ADD COLUMN "favorite_pro" TEXT;
ALTER TABLE "profiles" ADD COLUMN "phone" TEXT;
ALTER TABLE "profiles" ADD COLUMN "ok_to_text" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN "availability_times" TEXT[] DEFAULT ARRAY[]::TEXT[];
