-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "event_id" TEXT,
ADD COLUMN     "event_round" INTEGER;

-- CreateTable
CREATE TABLE "challenge_events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "format" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'rotating',
    "rotation" TEXT NOT NULL DEFAULT 'americano',
    "courts" INTEGER NOT NULL DEFAULT 2,
    "scoring" TEXT NOT NULL DEFAULT 'first_to_4',
    "points_per_win" INTEGER NOT NULL DEFAULT 1,
    "affects_elo" BOOLEAN NOT NULL DEFAULT true,
    "max_hill_wins" INTEGER,
    "current_round" INTEGER NOT NULL DEFAULT 0,
    "current_round_json" JSONB,
    "status" TEXT NOT NULL DEFAULT 'setup',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_participants" (
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "points" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "games_won" INTEGER NOT NULL DEFAULT 0,
    "sit_count" INTEGER NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_participants_pkey" PRIMARY KEY ("event_id","user_id")
);

-- CreateIndex
CREATE INDEX "matches_event_id_idx" ON "matches"("event_id");

-- CreateIndex
CREATE INDEX "challenge_events_status_date_idx" ON "challenge_events"("status", "date");

-- CreateIndex
CREATE INDEX "challenge_participants_event_id_idx" ON "challenge_participants"("event_id");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "challenge_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_events" ADD CONSTRAINT "challenge_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_events" ADD CONSTRAINT "challenge_events_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "challenge_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
