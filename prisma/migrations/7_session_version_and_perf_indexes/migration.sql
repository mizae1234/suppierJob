BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[User] ADD [sessionVersion] INT NOT NULL CONSTRAINT [User_sessionVersion_df] DEFAULT 0;

-- CreateIndex
CREATE NONCLUSTERED INDEX [Job_companyId_createdAt_idx] ON [dbo].[Job]([companyId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Job_supplierId_createdAt_idx] ON [dbo].[Job]([supplierId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CarWashItem_vin_status_idx] ON [dbo].[CarWashItem]([vin], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CarWashItem_actualWashDate_idx] ON [dbo].[CarWashItem]([actualWashDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [JobEvidence_photoUrl_idx] ON [dbo].[JobEvidence]([photoUrl]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VehicleSlideLog_supplierId_idx] ON [dbo].[VehicleSlideLog]([supplierId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VehicleSlideLog_originBranchId_idx] ON [dbo].[VehicleSlideLog]([originBranchId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VehicleSlideLog_destBranchId_idx] ON [dbo].[VehicleSlideLog]([destBranchId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

