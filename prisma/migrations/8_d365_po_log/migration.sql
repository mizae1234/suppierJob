BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[D365PoLog] (
    [id] NVARCHAR(1000) NOT NULL,
    [jobId] NVARCHAR(1000) NOT NULL,
    [jobNumber] NVARCHAR(1000) NOT NULL,
    [jobType] NVARCHAR(1000) NOT NULL,
    [trigger] NVARCHAR(1000) NOT NULL CONSTRAINT [D365PoLog_trigger_df] DEFAULT 'AUTO_APPROVE',
    [companyCode] NVARCHAR(1000),
    [branchName] NVARCHAR(1000),
    [supplierCode] NVARCHAR(1000),
    [supplierName] NVARCHAR(1000),
    [vendorAccount] NVARCHAR(1000),
    [vin] NVARCHAR(1000),
    [itemNumber] NVARCHAR(1000),
    [amount] FLOAT(53),
    [status] NVARCHAR(1000) NOT NULL,
    [purchId] NVARCHAR(1000),
    [httpStatus] INT,
    [message] NVARCHAR(max),
    [requestUrl] NVARCHAR(1000),
    [requestPayload] NVARCHAR(max),
    [responseBody] NVARCHAR(max),
    [durationMs] INT,
    [actorId] NVARCHAR(1000),
    [actorName] NVARCHAR(1000),
    [actorRole] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [D365PoLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [D365PoLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [D365PoLog_jobId_idx] ON [dbo].[D365PoLog]([jobId]);
CREATE NONCLUSTERED INDEX [D365PoLog_jobNumber_idx] ON [dbo].[D365PoLog]([jobNumber]);
CREATE NONCLUSTERED INDEX [D365PoLog_status_idx] ON [dbo].[D365PoLog]([status]);
CREATE NONCLUSTERED INDEX [D365PoLog_companyCode_idx] ON [dbo].[D365PoLog]([companyCode]);
CREATE NONCLUSTERED INDEX [D365PoLog_vendorAccount_idx] ON [dbo].[D365PoLog]([vendorAccount]);
CREATE NONCLUSTERED INDEX [D365PoLog_purchId_idx] ON [dbo].[D365PoLog]([purchId]);
CREATE NONCLUSTERED INDEX [D365PoLog_createdAt_idx] ON [dbo].[D365PoLog]([createdAt]);

-- AddForeignKey
ALTER TABLE [dbo].[D365PoLog] ADD CONSTRAINT [D365PoLog_jobId_fkey] FOREIGN KEY ([jobId]) REFERENCES [dbo].[Job]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

