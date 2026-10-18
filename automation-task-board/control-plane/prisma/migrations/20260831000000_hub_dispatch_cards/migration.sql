-- AlterEnum
ALTER TYPE "CardOrigin" ADD VALUE 'DESIGN_AUTOMATION_HUB';

-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "hubAutomationTaskId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "cards_projectId_hubAutomationTaskId_key" ON "cards"("projectId", "hubAutomationTaskId");

