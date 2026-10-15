BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[VehicleSlideLog] (
    [id] NVARCHAR(1000) NOT NULL,
    [vin] NVARCHAR(1000) NOT NULL,
    [jobId] NVARCHAR(1000) NOT NULL,
    [jobNumber] NVARCHAR(1000) NOT NULL,
    [action] NVARCHAR(1000) NOT NULL,
    [originBranchId] NVARCHAR(1000),
    [originName] NVARCHAR(1000) NOT NULL,
    [originAddress] NVARCHAR(1000),
    [originLat] FLOAT(53),
    [originLng] FLOAT(53),
    [destBranchId] NVARCHAR(1000),
    [destName] NVARCHAR(1000) NOT NULL,
    [destAddress] NVARCHAR(1000),
    [destLat] FLOAT(53),
    [destLng] FLOAT(53),
    [distance] FLOAT(53),
    [supplierId] NVARCHAR(1000),
    [supplierName] NVARCHAR(1000),
    [actorId] NVARCHAR(1000),
    [actorName] NVARCHAR(1000),
    [actorRole] NVARCHAR(1000),
    [remarks] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [VehicleSlideLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [VehicleSlideLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VehicleSlideLog_vin_idx] ON [dbo].[VehicleSlideLog]([vin]);
CREATE NONCLUSTERED INDEX [VehicleSlideLog_jobId_idx] ON [dbo].[VehicleSlideLog]([jobId]);
CREATE NONCLUSTERED INDEX [VehicleSlideLog_jobNumber_idx] ON [dbo].[VehicleSlideLog]([jobNumber]);
CREATE NONCLUSTERED INDEX [VehicleSlideLog_action_idx] ON [dbo].[VehicleSlideLog]([action]);
CREATE NONCLUSTERED INDEX [VehicleSlideLog_createdAt_idx] ON [dbo].[VehicleSlideLog]([createdAt]);

-- AddForeignKey
ALTER TABLE [dbo].[VehicleSlideLog] ADD CONSTRAINT [VehicleSlideLog_vin_fkey] FOREIGN KEY ([vin]) REFERENCES [dbo].[Vehicle]([vin]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VehicleSlideLog] ADD CONSTRAINT [VehicleSlideLog_jobId_fkey] FOREIGN KEY ([jobId]) REFERENCES [dbo].[Job]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
