BEGIN TRY

BEGIN TRAN;

-- AlterTable: เลิกใช้รหัส Vendor ช่องเดียว → เก็บแยกตามสาขาในตาราง SupplierVendorCode
ALTER TABLE [dbo].[Supplier] DROP COLUMN [d365VendorCode];
ALTER TABLE [dbo].[Supplier] ADD [d365PartyNumber] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[SupplierVendorCode] (
    [id] NVARCHAR(1000) NOT NULL,
    [supplierId] NVARCHAR(1000) NOT NULL,
    [branchId] NVARCHAR(1000) NOT NULL,
    [vendorCode] NVARCHAR(1000) NOT NULL,
    [vendorName] NVARCHAR(1000),
    [source] NVARCHAR(1000) NOT NULL CONSTRAINT [SupplierVendorCode_source_df] DEFAULT 'MANUAL',
    [verifiedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SupplierVendorCode_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SupplierVendorCode_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [SupplierVendorCode_supplierId_branchId_key] UNIQUE NONCLUSTERED ([supplierId],[branchId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SupplierVendorCode_branchId_idx] ON [dbo].[SupplierVendorCode]([branchId]);

-- AddForeignKey
ALTER TABLE [dbo].[SupplierVendorCode] ADD CONSTRAINT [SupplierVendorCode_supplierId_fkey] FOREIGN KEY ([supplierId]) REFERENCES [dbo].[Supplier]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[SupplierVendorCode] ADD CONSTRAINT [SupplierVendorCode_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[Branch]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
