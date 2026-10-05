BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [username] NVARCHAR(1000) NOT NULL,
    [password] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000) NOT NULL,
    [firstName] NVARCHAR(1000),
    [lastName] NVARCHAR(1000),
    [position] NVARCHAR(1000),
    [phone] NVARCHAR(1000),
    [role] NVARCHAR(1000) NOT NULL,
    [companyId] NVARCHAR(1000),
    [branchId] NVARCHAR(1000),
    [supplierId] NVARCHAR(1000),
    [isActive] BIT NOT NULL CONSTRAINT [User_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_username_key] UNIQUE NONCLUSTERED ([username])
);

-- CreateTable
CREATE TABLE [dbo].[Company] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [taxId] NVARCHAR(1000),
    [address] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Company_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Company_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Company_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Branch] (
    [id] NVARCHAR(1000) NOT NULL,
    [companyId] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [address] NVARCHAR(1000),
    [phone] NVARCHAR(1000),
    [latitude] FLOAT(53),
    [longitude] FLOAT(53),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Branch_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Branch_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Branch_companyId_code_key] UNIQUE NONCLUSTERED ([companyId],[code])
);

-- CreateTable
CREATE TABLE [dbo].[Supplier] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [taxId] NVARCHAR(1000),
    [phone] NVARCHAR(1000),
    [email] NVARCHAR(1000),
    [address] NVARCHAR(1000),
    [services] NVARCHAR(1000) NOT NULL,
    [bankName] NVARCHAR(1000),
    [bankAccount] NVARCHAR(1000),
    [isActive] BIT NOT NULL CONSTRAINT [Supplier_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Supplier_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Supplier_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Supplier_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Vehicle] (
    [vin] NVARCHAR(1000) NOT NULL,
    [model] NVARCHAR(1000) NOT NULL,
    [color] NVARCHAR(1000) NOT NULL,
    [companyId] NVARCHAR(1000) NOT NULL,
    [currentBranchId] NVARCHAR(1000) NOT NULL,
    [vehicleType] NVARCHAR(1000) NOT NULL,
    [licensePlate] NVARCHAR(1000),
    [mileage] INT,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Vehicle_status_df] DEFAULT 'AVAILABLE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Vehicle_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Vehicle_pkey] PRIMARY KEY CLUSTERED ([vin])
);

-- CreateTable
CREATE TABLE [dbo].[Job] (
    [id] NVARCHAR(1000) NOT NULL,
    [jobNumber] NVARCHAR(1000) NOT NULL,
    [jobType] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Job_status_df] DEFAULT 'IN_PROGRESS',
    [companyId] NVARCHAR(1000) NOT NULL,
    [branchId] NVARCHAR(1000) NOT NULL,
    [supplierId] NVARCHAR(1000) NOT NULL,
    [vin] NVARCHAR(1000),
    [originBranchId] NVARCHAR(1000),
    [destBranchId] NVARCHAR(1000),
    [customDestAddress] NVARCHAR(1000),
    [customDestLat] FLOAT(53),
    [customDestLng] FLOAT(53),
    [customOriginAddress] NVARCHAR(1000),
    [customOriginLat] FLOAT(53),
    [customOriginLng] FLOAT(53),
    [pickupDateTime] DATETIME2,
    [deliveryDateTime] DATETIME2,
    [contactPerson] NVARCHAR(1000),
    [contactPhone] NVARCHAR(1000),
    [transferReason] NVARCHAR(1000),
    [requestedById] NVARCHAR(1000),
    [requestedBy] NVARCHAR(1000),
    [requesterPosition] NVARCHAR(1000),
    [requesterPhone] NVARCHAR(1000),
    [completedAt] DATETIME2,
    [approvedAt] DATETIME2,
    [approvedBy] NVARCHAR(1000),
    [rejectReason] NVARCHAR(1000),
    [estimatedCost] FLOAT(53),
    [actualCost] FLOAT(53),
    [invoiceId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Job_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Job_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Job_jobNumber_key] UNIQUE NONCLUSTERED ([jobNumber])
);

-- CreateTable
CREATE TABLE [dbo].[CarWashItem] (
    [id] NVARCHAR(1000) NOT NULL,
    [jobId] NVARCHAR(1000) NOT NULL,
    [vin] NVARCHAR(1000) NOT NULL,
    [actualWashDate] DATETIME2 NOT NULL,
    [washType] NVARCHAR(1000) NOT NULL CONSTRAINT [CarWashItem_washType_df] DEFAULT 'STANDARD',
    [unitPrice] FLOAT(53) NOT NULL CONSTRAINT [CarWashItem_unitPrice_df] DEFAULT 150.0,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [CarWashItem_status_df] DEFAULT 'PENDING',
    [remarks] NVARCHAR(1000),
    CONSTRAINT [CarWashItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[JobEvidence] (
    [id] NVARCHAR(1000) NOT NULL,
    [jobId] NVARCHAR(1000) NOT NULL,
    [vin] NVARCHAR(1000),
    [photoUrl] NVARCHAR(1000) NOT NULL,
    [caption] NVARCHAR(1000),
    [evidenceType] NVARCHAR(1000) NOT NULL,
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [JobEvidence_uploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [JobEvidence_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[JobActivity] (
    [id] NVARCHAR(1000) NOT NULL,
    [jobId] NVARCHAR(1000) NOT NULL,
    [action] NVARCHAR(1000) NOT NULL,
    [actor] NVARCHAR(1000),
    [actorRole] NVARCHAR(1000),
    [itemId] NVARCHAR(1000),
    [vin] NVARCHAR(1000),
    [description] NVARCHAR(1000) NOT NULL,
    [metadata] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [JobActivity_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [JobActivity_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Invoice] (
    [id] NVARCHAR(1000) NOT NULL,
    [invoiceNumber] NVARCHAR(1000) NOT NULL,
    [supplierId] NVARCHAR(1000) NOT NULL,
    [companyId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Invoice_status_df] DEFAULT 'SUBMITTED',
    [invoiceDate] DATETIME2 NOT NULL CONSTRAINT [Invoice_invoiceDate_df] DEFAULT CURRENT_TIMESTAMP,
    [dueDate] DATETIME2,
    [subtotal] FLOAT(53) NOT NULL,
    [vatAmount] FLOAT(53) NOT NULL,
    [totalAmount] FLOAT(53) NOT NULL,
    [notes] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Invoice_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Invoice_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Invoice_invoiceNumber_key] UNIQUE NONCLUSTERED ([invoiceNumber])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000),
    [userName] NVARCHAR(1000),
    [userRole] NVARCHAR(1000),
    [supplierId] NVARCHAR(1000),
    [action] NVARCHAR(1000) NOT NULL,
    [entityType] NVARCHAR(1000),
    [entityId] NVARCHAR(1000),
    [description] NVARCHAR(1000) NOT NULL,
    [metadata] NVARCHAR(1000),
    [ipAddress] NVARCHAR(1000),
    [userAgent] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Vehicle_companyId_idx] ON [dbo].[Vehicle]([companyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Vehicle_currentBranchId_idx] ON [dbo].[Vehicle]([currentBranchId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Vehicle_status_idx] ON [dbo].[Vehicle]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Job_companyId_status_idx] ON [dbo].[Job]([companyId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Job_supplierId_status_idx] ON [dbo].[Job]([supplierId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Job_branchId_idx] ON [dbo].[Job]([branchId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Job_status_idx] ON [dbo].[Job]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Job_createdAt_idx] ON [dbo].[Job]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Job_vin_idx] ON [dbo].[Job]([vin]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Job_invoiceId_idx] ON [dbo].[Job]([invoiceId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CarWashItem_jobId_idx] ON [dbo].[CarWashItem]([jobId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CarWashItem_vin_idx] ON [dbo].[CarWashItem]([vin]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [JobEvidence_jobId_idx] ON [dbo].[JobEvidence]([jobId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [JobActivity_jobId_idx] ON [dbo].[JobActivity]([jobId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [JobActivity_createdAt_idx] ON [dbo].[JobActivity]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Invoice_companyId_status_idx] ON [dbo].[Invoice]([companyId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Invoice_supplierId_status_idx] ON [dbo].[Invoice]([supplierId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Invoice_createdAt_idx] ON [dbo].[Invoice]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_userId_idx] ON [dbo].[AuditLog]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_supplierId_idx] ON [dbo].[AuditLog]([supplierId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_action_idx] ON [dbo].[AuditLog]([action]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_entityType_entityId_idx] ON [dbo].[AuditLog]([entityType], [entityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_createdAt_idx] ON [dbo].[AuditLog]([createdAt]);

-- AddForeignKey
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[Branch]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_supplierId_fkey] FOREIGN KEY ([supplierId]) REFERENCES [dbo].[Supplier]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Branch] ADD CONSTRAINT [Branch_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Vehicle] ADD CONSTRAINT [Vehicle_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Vehicle] ADD CONSTRAINT [Vehicle_currentBranchId_fkey] FOREIGN KEY ([currentBranchId]) REFERENCES [dbo].[Branch]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Job] ADD CONSTRAINT [Job_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Job] ADD CONSTRAINT [Job_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[Branch]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Job] ADD CONSTRAINT [Job_supplierId_fkey] FOREIGN KEY ([supplierId]) REFERENCES [dbo].[Supplier]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Job] ADD CONSTRAINT [Job_vin_fkey] FOREIGN KEY ([vin]) REFERENCES [dbo].[Vehicle]([vin]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Job] ADD CONSTRAINT [Job_originBranchId_fkey] FOREIGN KEY ([originBranchId]) REFERENCES [dbo].[Branch]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Job] ADD CONSTRAINT [Job_destBranchId_fkey] FOREIGN KEY ([destBranchId]) REFERENCES [dbo].[Branch]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Job] ADD CONSTRAINT [Job_invoiceId_fkey] FOREIGN KEY ([invoiceId]) REFERENCES [dbo].[Invoice]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CarWashItem] ADD CONSTRAINT [CarWashItem_jobId_fkey] FOREIGN KEY ([jobId]) REFERENCES [dbo].[Job]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CarWashItem] ADD CONSTRAINT [CarWashItem_vin_fkey] FOREIGN KEY ([vin]) REFERENCES [dbo].[Vehicle]([vin]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[JobEvidence] ADD CONSTRAINT [JobEvidence_jobId_fkey] FOREIGN KEY ([jobId]) REFERENCES [dbo].[Job]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[JobActivity] ADD CONSTRAINT [JobActivity_jobId_fkey] FOREIGN KEY ([jobId]) REFERENCES [dbo].[Job]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Invoice] ADD CONSTRAINT [Invoice_supplierId_fkey] FOREIGN KEY ([supplierId]) REFERENCES [dbo].[Supplier]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Invoice] ADD CONSTRAINT [Invoice_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

