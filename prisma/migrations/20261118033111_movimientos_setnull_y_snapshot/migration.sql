/*
  Warnings:

  - Added the required column `productoNombre` to the `MovimientoInventario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productoReferencia` to the `MovimientoInventario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `proveedor` to the `MovimientoInventario` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MovimientoInventario" DROP CONSTRAINT "MovimientoInventario_productoId_fkey";

-- AlterTable
ALTER TABLE "MovimientoInventario" ADD COLUMN     "productoNombre" TEXT NOT NULL,
ADD COLUMN     "productoReferencia" TEXT NOT NULL,
ADD COLUMN     "proveedor" TEXT NOT NULL,
ADD COLUMN     "seccion" TEXT,
ALTER COLUMN "productoId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
