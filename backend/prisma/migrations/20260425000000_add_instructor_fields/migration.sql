-- AlterTable
ALTER TABLE "profiles" ADD COLUMN "is_instructor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN "accepting_clients" BOOLEAN NOT NULL DEFAULT false;
