-- CreateTable
CREATE TABLE "card_events" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "fromColumn" "CardColumn" NOT NULL,
    "toColumn" "CardColumn" NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "card_events_cardId_createdAt_idx" ON "card_events"("cardId", "createdAt");

-- AddForeignKey
ALTER TABLE "card_events" ADD CONSTRAINT "card_events_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
