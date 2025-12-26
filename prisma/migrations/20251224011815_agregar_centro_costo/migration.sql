-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "centroCostoId" TEXT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "centroCostoId" TEXT;

-- CreateTable
CREATE TABLE "CentroCosto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CentroCosto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CentroCosto_nombre_key" ON "CentroCosto"("nombre");

-- CreateIndex
CREATE INDEX "CentroCosto_nombre_idx" ON "CentroCosto"("nombre");

-- CreateIndex
CREATE INDEX "CentroCosto_activo_idx" ON "CentroCosto"("activo");

-- CreateIndex
CREATE INDEX "Producto_centroCostoId_idx" ON "Producto"("centroCostoId");

-- CreateIndex
CREATE INDEX "Usuario_centroCostoId_idx" ON "Usuario"("centroCostoId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
