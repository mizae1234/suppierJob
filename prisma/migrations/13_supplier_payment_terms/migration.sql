BEGIN TRY

BEGIN TRAN;

-- AlterTable: เงื่อนไขและวิธีชำระเงินของ Supplier จาก D365 (เช่น Cash, 15D, 30D, 60D / Transfer)
ALTER TABLE [dbo].[Supplier] ADD [paymentTerms] NVARCHAR(1000);
ALTER TABLE [dbo].[Supplier] ADD [paymentMethod] NVARCHAR(1000);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
