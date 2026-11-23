BEGIN TRY

BEGIN TRAN;

-- AlterTable: สถานะการโอนคลัง D365 (Transfer Journal) สำหรับติดตาม/retry
ALTER TABLE [dbo].[Job] ADD [d365TransferStatus] NVARCHAR(1000);
ALTER TABLE [dbo].[Job] ADD [d365TransferMessage] NVARCHAR(1000);
ALTER TABLE [dbo].[Job] ADD [d365TransferSentAt] DATETIME2;

-- AlterTable: คลังต้นทางรายคัน (snapshot ก่อนย้ายคลัง)
ALTER TABLE [dbo].[CarWashItem] ADD [fromWarehouseId] NVARCHAR(1000);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Job_requestedById_idx] ON [dbo].[Job]([requestedById]);
CREATE NONCLUSTERED INDEX [Job_updatedAt_idx] ON [dbo].[Job]([updatedAt]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

