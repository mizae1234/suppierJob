BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Vehicle] ADD [d365ItemId] NVARCHAR(1000),
[d365Reserved] BIT NOT NULL CONSTRAINT [Vehicle_d365Reserved_df] DEFAULT 0,
[d365SiteId] NVARCHAR(1000),
[d365WarehouseId] NVARCHAR(1000),
[lastSyncedAt] DATETIME2,
[outOfStockAt] DATETIME2,
[source] NVARCHAR(1000) NOT NULL CONSTRAINT [Vehicle_source_df] DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE [dbo].[D365SyncRun] (
    [id] NVARCHAR(1000) NOT NULL,
    [trigger] NVARCHAR(1000) NOT NULL,
    [triggeredBy] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL,
    [startedAt] DATETIME2 NOT NULL CONSTRAINT [D365SyncRun_startedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [finishedAt] DATETIME2,
    [fetched] INT NOT NULL CONSTRAINT [D365SyncRun_fetched_df] DEFAULT 0,
    [created] INT NOT NULL CONSTRAINT [D365SyncRun_created_df] DEFAULT 0,
    [updated] INT NOT NULL CONSTRAINT [D365SyncRun_updated_df] DEFAULT 0,
    [restocked] INT NOT NULL CONSTRAINT [D365SyncRun_restocked_df] DEFAULT 0,
    [outOfStock] INT NOT NULL CONSTRAINT [D365SyncRun_outOfStock_df] DEFAULT 0,
    [skipped] INT NOT NULL CONSTRAINT [D365SyncRun_skipped_df] DEFAULT 0,
    [errors] NVARCHAR(max),
    CONSTRAINT [D365SyncRun_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [D365SyncRun_startedAt_idx] ON [dbo].[D365SyncRun]([startedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [D365SyncRun_status_idx] ON [dbo].[D365SyncRun]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Vehicle_source_idx] ON [dbo].[Vehicle]([source]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

