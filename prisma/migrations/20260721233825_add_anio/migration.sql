-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "anioInventario" INTEGER NOT NULL DEFAULT 2025;

-- CreateIndex
CREATE INDEX "Producto_anioInventario_idx" ON "Producto"("anioInventario");

-- CreateIndex
CREATE INDEX "Producto_centroCostoId_anioInventario_idx" ON "Producto"("centroCostoId", "anioInventario");
