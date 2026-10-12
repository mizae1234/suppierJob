BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[User] ADD [mustChangePassword] BIT NOT NULL CONSTRAINT [User_mustChangePassword_df] DEFAULT 0;

-- CreateIndex
CREATE NONCLUSTERED INDEX [Job_originBranchId_idx] ON [dbo].[Job]([originBranchId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Job_destBranchId_idx] ON [dbo].[Job]([destBranchId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

