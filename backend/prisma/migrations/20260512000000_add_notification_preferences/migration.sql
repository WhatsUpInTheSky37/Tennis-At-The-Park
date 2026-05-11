-- CreateTable
CREATE TABLE "notification_preferences" (
    "user_id" TEXT NOT NULL,
    "dms" BOOLEAN NOT NULL DEFAULT true,
    "forum_replies" BOOLEAN NOT NULL DEFAULT true,
    "forum_reactions" BOOLEAN NOT NULL DEFAULT true,
    "challenges" BOOLEAN NOT NULL DEFAULT true,
    "session_invites" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
