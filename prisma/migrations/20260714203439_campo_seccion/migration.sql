-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "seccion" TEXT;

-- CreateIndex
CREATE INDEX "Producto_seccion_idx" ON "Producto"("seccion");
