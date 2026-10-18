-- CreateEnum
CREATE TYPE "CardColumn" AS ENUM ('CLAIMABLE', 'RUNNING', 'NEEDS_ATTENTION', 'AWAITING_REVIEW', 'DONE');

-- CreateEnum
CREATE TYPE "CardOrigin" AS ENUM ('MEMBER', 'PIPELINE_CHAIN');

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machines" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "label" TEXT,
    "runners" TEXT[],
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_chain_entries" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "taskId" TEXT NOT NULL,
    "requiresReview" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "task_chain_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "column" "CardColumn" NOT NULL DEFAULT 'CLAIMABLE',
    "origin" "CardOrigin" NOT NULL,
    "autoRun" BOOLEAN NOT NULL DEFAULT false,
    "reviewGate" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "attentionReason" TEXT,
    "resumePreviousRunId" TEXT,
    "resumeNote" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leases" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "runnerId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runs" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "verification" JSONB,
    "memberId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "runnerId" TEXT,
    "resumedFrom" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_chunks" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "machines_machineId_key" ON "machines"("machineId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "task_chain_entries_projectId_position_key" ON "task_chain_entries"("projectId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "task_chain_entries_projectId_taskId_key" ON "task_chain_entries"("projectId", "taskId");

-- CreateIndex
CREATE INDEX "cards_column_idx" ON "cards"("column");

-- CreateIndex
CREATE INDEX "cards_projectId_taskId_idx" ON "cards"("projectId", "taskId");

-- CreateIndex
CREATE INDEX "leases_cardId_active_idx" ON "leases"("cardId", "active");

-- CreateIndex
CREATE INDEX "leases_active_expiresAt_idx" ON "leases"("active", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "runs_runId_key" ON "runs"("runId");

-- CreateIndex
CREATE INDEX "log_chunks_createdAt_idx" ON "log_chunks"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "log_chunks_runId_seq_key" ON "log_chunks"("runId", "seq");

-- AddForeignKey
ALTER TABLE "machines" ADD CONSTRAINT "machines_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_chain_entries" ADD CONSTRAINT "task_chain_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_chunks" ADD CONSTRAINT "log_chunks_runId_fkey" FOREIGN KEY ("runId") REFERENCES "runs"("runId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_chunks" ADD CONSTRAINT "log_chunks_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
