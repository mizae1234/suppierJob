BEGIN TRY

BEGIN TRAN;

-- AlterTable: ผลการจบงานสไลด์ (เที่ยวเปล่า / สไลด์ไม่สำเร็จ)
ALTER TABLE [dbo].[Job] ADD [completionType] NVARCHAR(1000),
[failReasonCode] NVARCHAR(1000),
[failNote] NVARCHAR(1000);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

