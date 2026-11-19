-- CreateTable
CREATE TABLE "HistorialAlerta" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "centroCostoId" TEXT,
    "usuarioId" TEXT,
    "costoAnterior" INTEGER,
    "costoNuevo" INTEGER NOT NULL,
    "precioVentaNuevo" DOUBLE PRECISION,
    "resuelto" BOOLEAN NOT NULL DEFAULT false,
    "resueltoPorId" TEXT,
    "resueltoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialAlerta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistorialAlerta_centroCostoId_resuelto_idx" ON "HistorialAlerta"("centroCostoId", "resuelto");

-- CreateIndex
CREATE INDEX "HistorialAlerta_productoId_idx" ON "HistorialAlerta"("productoId");

-- CreateIndex
CREATE INDEX "HistorialAlerta_tipo_idx" ON "HistorialAlerta"("tipo");

-- CreateIndex
CREATE INDEX "HistorialAlerta_createdAt_idx" ON "HistorialAlerta"("createdAt");

-- AddForeignKey
ALTER TABLE "HistorialAlerta" ADD CONSTRAINT "HistorialAlerta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialAlerta" ADD CONSTRAINT "HistorialAlerta_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialAlerta" ADD CONSTRAINT "HistorialAlerta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialAlerta" ADD CONSTRAINT "HistorialAlerta_resueltoPorId_fkey" FOREIGN KEY ("resueltoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
