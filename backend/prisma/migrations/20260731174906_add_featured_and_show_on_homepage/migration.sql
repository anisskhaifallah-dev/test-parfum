-- AlterTable
ALTER TABLE "Pack" ADD COLUMN     "showOnHomepage" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;
