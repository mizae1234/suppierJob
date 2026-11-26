BEGIN TRY

BEGIN TRAN;

-- AlterTable Job: เลข Invoice ชุดแรกตอนอนุมัติ + สถานะรออัปเดต/อัปเดตแล้ว + เลข Invoice ของ Vendor
ALTER TABLE [dbo].[Job] ADD [initialInvoiceNumber] NVARCHAR(1000);
ALTER TABLE [dbo].[Job] ADD [vendorInvoiceNumber] NVARCHAR(1000);
ALTER TABLE [dbo].[Job] ADD [invoiceUpdateStatus] NVARCHAR(1000);
ALTER TABLE [dbo].[Job] ADD [invoiceUpdatedAt] DATETIME2;
ALTER TABLE [dbo].[Job] ADD [invoiceUpdatedBy] NVARCHAR(1000);

-- AlterTable Invoice: เก็บเลข Invoice ของ Vendor คู่กับเลข Invoice ระบบ
ALTER TABLE [dbo].[Invoice] ADD [vendorInvoiceNumber] NVARCHAR(1000);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Job_initialInvoiceNumber_idx] ON [dbo].[Job]([initialInvoiceNumber]);
CREATE NONCLUSTERED INDEX [Job_invoiceUpdateStatus_idx] ON [dbo].[Job]([invoiceUpdateStatus]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
