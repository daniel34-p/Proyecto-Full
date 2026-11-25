-- CreateIndex
CREATE INDEX "Producto_updatedAt_idx" ON "Producto"("updatedAt");

-- CreateIndex
CREATE INDEX "Producto_centroCostoId_updatedAt_idx" ON "Producto"("centroCostoId", "updatedAt");
