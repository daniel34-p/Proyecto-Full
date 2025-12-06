-- AlterTable
ALTER TABLE "Producto" ALTER COLUMN "cantidad" SET DATA TYPE DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Producto_referencia_idx" ON "Producto"("referencia");
