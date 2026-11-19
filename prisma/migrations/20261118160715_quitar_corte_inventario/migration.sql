/*
  Warnings:

  - You are about to drop the `InventarioCorte` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "InventarioCorte" DROP CONSTRAINT "InventarioCorte_centroCostoId_fkey";

-- DropForeignKey
ALTER TABLE "InventarioCorte" DROP CONSTRAINT "InventarioCorte_creadoPorId_fkey";

-- DropTable
DROP TABLE "InventarioCorte";
