BEGIN TRY

BEGIN TRAN;

-- AlterTable: รหัสคลัง D365 ปลายทาง (สไลด์ระหว่างสาขา)
ALTER TABLE [dbo].[Job] ADD [destWarehouseId] NVARCHAR(1000);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

