-- CreateTable
CREATE TABLE "MovimientoInventario" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "centroCostoId" TEXT,
    "usuarioId" TEXT,
    "valorAnterior" DOUBLE PRECISION NOT NULL,
    "valorNuevo" DOUBLE PRECISION NOT NULL,
    "deltaValor" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoInventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventarioCorte" (
    "id" TEXT NOT NULL,
    "centroCostoId" TEXT NOT NULL,
    "creadoPorId" TEXT,
    "granTotal" DOUBLE PRECISION NOT NULL,
    "granTotalDanado" DOUBLE PRECISION NOT NULL,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventarioCorte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovimientoInventario_centroCostoId_createdAt_idx" ON "MovimientoInventario"("centroCostoId", "createdAt");

-- CreateIndex
CREATE INDEX "MovimientoInventario_productoId_idx" ON "MovimientoInventario"("productoId");

-- CreateIndex
CREATE INDEX "MovimientoInventario_tipo_idx" ON "MovimientoInventario"("tipo");

-- CreateIndex
CREATE INDEX "InventarioCorte_centroCostoId_createdAt_idx" ON "InventarioCorte"("centroCostoId", "createdAt");

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioCorte" ADD CONSTRAINT "InventarioCorte_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioCorte" ADD CONSTRAINT "InventarioCorte_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
