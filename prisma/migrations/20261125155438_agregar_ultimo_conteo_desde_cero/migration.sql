-- DropIndex
DROP INDEX "Producto_centroCostoId_updatedAt_idx";

-- DropIndex
DROP INDEX "Producto_updatedAt_idx";

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "ultimoConteoAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Producto_ultimoConteoAt_idx" ON "Producto"("ultimoConteoAt");

-- CreateIndex
CREATE INDEX "Producto_centroCostoId_ultimoConteoAt_idx" ON "Producto"("centroCostoId", "ultimoConteoAt");
