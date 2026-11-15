BEGIN TRY

BEGIN TRAN;

-- AlterTable: วิธีคิดค่าบริการรถสไลด์ (คำนวณอัตโนมัติ / กรอกเอง)
ALTER TABLE [dbo].[Job] ADD [pricingMode] NVARCHAR(1000),
[distance] FLOAT(53),
[contractCost] FLOAT(53),
[manualPriceNote] NVARCHAR(1000);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

