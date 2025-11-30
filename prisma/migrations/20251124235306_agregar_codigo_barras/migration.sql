/*
  Warnings:

  - A unique constraint covering the columns `[codigoBarras]` on the table `Producto` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Producto_codigo_key";

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "codigoBarras" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Producto_codigoBarras_key" ON "Producto"("codigoBarras");
