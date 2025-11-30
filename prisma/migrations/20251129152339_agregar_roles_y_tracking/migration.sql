-- DropIndex
DROP INDEX "Producto_codigo_idx";

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "creadoPorId" TEXT,
ADD COLUMN     "editadoPorId" TEXT,
ALTER COLUMN "codigoBarras" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Producto_creadoPorId_idx" ON "Producto"("creadoPorId");

-- CreateIndex
CREATE INDEX "Usuario_activo_idx" ON "Usuario"("activo");

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_editadoPorId_fkey" FOREIGN KEY ("editadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
