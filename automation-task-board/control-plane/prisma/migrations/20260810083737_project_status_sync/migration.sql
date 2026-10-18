-- CreateTable
CREATE TABLE "project_snapshots" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "hasDefinition" BOOLEAN NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_runs" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "runnerId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "reportedByMachineId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_snapshots_projectId_key" ON "project_snapshots"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "external_runs_runId_key" ON "external_runs"("runId");

-- CreateIndex
CREATE INDEX "external_runs_projectId_updatedAt_idx" ON "external_runs"("projectId", "updatedAt");

-- AddForeignKey
ALTER TABLE "project_snapshots" ADD CONSTRAINT "project_snapshots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_runs" ADD CONSTRAINT "external_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
