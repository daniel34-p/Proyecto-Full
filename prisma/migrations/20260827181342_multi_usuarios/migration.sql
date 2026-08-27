-- CreateTable
CREATE TABLE "UsuarioCentroCosto" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "centroCostoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsuarioCentroCosto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsuarioCentroCosto_usuarioId_idx" ON "UsuarioCentroCosto"("usuarioId");

-- CreateIndex
CREATE INDEX "UsuarioCentroCosto_centroCostoId_idx" ON "UsuarioCentroCosto"("centroCostoId");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioCentroCosto_usuarioId_centroCostoId_key" ON "UsuarioCentroCosto"("usuarioId", "centroCostoId");

-- AddForeignKey
ALTER TABLE "UsuarioCentroCosto" ADD CONSTRAINT "UsuarioCentroCosto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioCentroCosto" ADD CONSTRAINT "UsuarioCentroCosto_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
