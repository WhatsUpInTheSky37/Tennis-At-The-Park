-- AlterTable: add fields to forum_posts
ALTER TABLE "forum_posts" ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "edited_at" TIMESTAMP(3);

-- AlterTable: add edited_at to forum_replies
ALTER TABLE "forum_replies" ADD COLUMN     "edited_at" TIMESTAMP(3);

-- AlterTable: add forum fields to reports
ALTER TABLE "reports" ADD COLUMN     "forum_post_id" TEXT,
ADD COLUMN     "forum_reply_id" TEXT;

-- CreateTable
CREATE TABLE "forum_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_reactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "post_id" TEXT,
    "reply_id" TEXT,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "from_user_id" TEXT,
    "type" TEXT NOT NULL,
    "post_id" TEXT,
    "reply_id" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "forum_posts_pinned_created_at_idx" ON "forum_posts"("pinned", "created_at");

-- CreateIndex
CREATE INDEX "forum_posts_category_id_idx" ON "forum_posts"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "forum_categories_name_key" ON "forum_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "forum_categories_slug_key" ON "forum_categories"("slug");

-- CreateIndex
CREATE INDEX "forum_reactions_post_id_idx" ON "forum_reactions"("post_id");

-- CreateIndex
CREATE INDEX "forum_reactions_reply_id_idx" ON "forum_reactions"("reply_id");

-- CreateIndex
CREATE UNIQUE INDEX "forum_reactions_user_id_post_id_emoji_key" ON "forum_reactions"("user_id", "post_id", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "forum_reactions_user_id_reply_id_emoji_key" ON "forum_reactions"("user_id", "reply_id", "emoji");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "forum_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_reactions" ADD CONSTRAINT "forum_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_reactions" ADD CONSTRAINT "forum_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_reactions" ADD CONSTRAINT "forum_reactions_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "forum_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "forum_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_forum_post_id_fkey" FOREIGN KEY ("forum_post_id") REFERENCES "forum_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_forum_reply_id_fkey" FOREIGN KEY ("forum_reply_id") REFERENCES "forum_replies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default categories
INSERT INTO "forum_categories" ("id", "name", "slug", "emoji", "sort_order", "created_at") VALUES
  ('cat_general',     'General',         'general',     E'\U0001F4AC', 10, CURRENT_TIMESTAMP),
  ('cat_find_match',  'Find a Match',    'find-match',  E'\U0001F3BE', 20, CURRENT_TIMESTAMP),
  ('cat_lessons',     'Lessons & Tips',  'lessons',     E'\U0001F4D6', 30, CURRENT_TIMESTAMP),
  ('cat_courts',      'Court Conditions','courts',      E'\U0001F3DF', 40, CURRENT_TIMESTAMP),
  ('cat_trash_talk',  'Trash Talk',      'trash-talk',  E'\U0001F525', 50, CURRENT_TIMESTAMP);
