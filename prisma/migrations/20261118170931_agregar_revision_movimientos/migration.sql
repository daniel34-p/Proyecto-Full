-- AlterTable
ALTER TABLE "MovimientoInventario" ADD COLUMN     "resuelto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resueltoAt" TIMESTAMP(3),
ADD COLUMN     "resueltoPorId" TEXT;

-- CreateIndex
CREATE INDEX "MovimientoInventario_centroCostoId_resuelto_idx" ON "MovimientoInventario"("centroCostoId", "resuelto");

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_resueltoPorId_fkey" FOREIGN KEY ("resueltoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
