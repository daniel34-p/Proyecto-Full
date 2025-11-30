-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "producto" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "unidades" TEXT NOT NULL,
    "costo" TEXT NOT NULL,
    "precioVenta" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Producto_codigo_key" ON "Producto"("codigo");

-- CreateIndex
CREATE INDEX "Producto_codigo_idx" ON "Producto"("codigo");

-- CreateIndex
CREATE INDEX "Producto_proveedor_idx" ON "Producto"("proveedor");

-- CreateIndex
CREATE INDEX "Producto_producto_idx" ON "Producto"("producto");
