-- AlterTable: Make imageUrl nullable in PaymentMobile
ALTER TABLE "PaymentMobile" ALTER COLUMN "imageUrl" DROP NOT NULL;
