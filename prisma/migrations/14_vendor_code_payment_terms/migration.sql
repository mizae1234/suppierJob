BEGIN TRY

BEGIN TRAN;

-- AlterTable: เงื่อนไขและวิธีชำระเงินรายสาขา (Legal Entity) ของ SupplierVendorCode จาก D365
ALTER TABLE [dbo].[SupplierVendorCode] ADD [paymentTerms] NVARCHAR(1000);
ALTER TABLE [dbo].[SupplierVendorCode] ADD [paymentMethod] NVARCHAR(1000);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
