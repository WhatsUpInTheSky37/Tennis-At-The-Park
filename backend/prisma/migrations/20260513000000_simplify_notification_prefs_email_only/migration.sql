-- In-app notifications are always on for everyone now; the only preference
-- is whether to also receive emails. Drop the per-category opt-out columns.
ALTER TABLE "notification_preferences" DROP COLUMN "dms";
ALTER TABLE "notification_preferences" DROP COLUMN "forum_replies";
ALTER TABLE "notification_preferences" DROP COLUMN "forum_reactions";
ALTER TABLE "notification_preferences" DROP COLUMN "challenges";
ALTER TABLE "notification_preferences" DROP COLUMN "session_invites";
