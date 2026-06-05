-- AlterTable: allow notifications to carry custom admin-authored text
ALTER TABLE "notifications" ADD COLUMN "title" TEXT;
ALTER TABLE "notifications" ADD COLUMN "message" TEXT;
ALTER TABLE "notifications" ADD COLUMN "link" TEXT;
