BEGIN TRY

BEGIN TRAN;

-- CreateTable: ตาราง Master คลังสินค้า (Warehouses) จาก D365 F&O (GET /data/Warehouses)
CREATE TABLE [dbo].[D365Warehouse] (
    [id] NVARCHAR(1000) NOT NULL,
    [warehouseId] NVARCHAR(1000) NOT NULL,
    [warehouseName] NVARCHAR(1000) NOT NULL,
    [dataAreaId] NVARCHAR(1000) NOT NULL,
    [branchId] NVARCHAR(1000),
    [isPrimary] BIT NOT NULL CONSTRAINT [D365Warehouse_isPrimary_df] DEFAULT 0,
    [isActive] BIT NOT NULL CONSTRAINT [D365Warehouse_isActive_df] DEFAULT 1,
    [lastSyncedAt] DATETIME2 NOT NULL CONSTRAINT [D365Warehouse_lastSyncedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [D365Warehouse_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [D365Warehouse_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [D365Warehouse_dataAreaId_warehouseId_key] UNIQUE NONCLUSTERED ([dataAreaId], [warehouseId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [D365Warehouse_dataAreaId_idx] ON [dbo].[D365Warehouse]([dataAreaId]);
CREATE NONCLUSTERED INDEX [D365Warehouse_warehouseId_idx] ON [dbo].[D365Warehouse]([warehouseId]);
CREATE NONCLUSTERED INDEX [D365Warehouse_branchId_idx] ON [dbo].[D365Warehouse]([branchId]);
CREATE NONCLUSTERED INDEX [D365Warehouse_isActive_idx] ON [dbo].[D365Warehouse]([isActive]);

-- AddForeignKey
ALTER TABLE [dbo].[D365Warehouse] ADD CONSTRAINT [D365Warehouse_branchId_fkey]
    FOREIGN KEY ([branchId]) REFERENCES [dbo].[Branch]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
