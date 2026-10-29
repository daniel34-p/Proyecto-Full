-- DropIndex
DROP INDEX "OpcionCatalogo_tipo_idx";

-- DropIndex
DROP INDEX "OpcionCatalogo_tipo_valor_key";

-- AlterTable
ALTER TABLE "OpcionCatalogo" ADD COLUMN     "centroCostoId" TEXT;

-- CreateIndex
CREATE INDEX "OpcionCatalogo_tipo_centroCostoId_idx" ON "OpcionCatalogo"("tipo", "centroCostoId");

-- AddForeignKey
-- ON DELETE CASCADE (no el SET NULL que generaría Prisma por defecto para
-- una columna nullable): si se borra un centro de costo, sus proveedores y
-- unidades personalizados deben desaparecer con él, no "volverse globales"
-- (NULL significa catálogo global en este modelo - ver comentario en
-- schema.prisma). Mismo criterio que ya usa UsuarioCentroCosto.
ALTER TABLE "OpcionCatalogo" ADD CONSTRAINT "OpcionCatalogo_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "CentroCosto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prisma no soporta índices únicos condicionales (parciales) en el schema,
-- así que se crean a mano aquí - son el equivalente real de la regla de
-- negocio: "secciones" es un catálogo único global (centroCostoId NULL),
-- "proveedores"/"unidades" son únicos POR CENTRO (centroCostoId no nulo).
-- Un UNIQUE normal sobre (tipo, valor, centroCostoId) no serviría para el
-- caso global: en Postgres dos NULL nunca se consideran iguales, así que no
-- bloquearía dos filas "secciones"+mismo valor ambas con centroCostoId NULL.
CREATE UNIQUE INDEX "OpcionCatalogo_global_tipo_valor_key"
  ON "OpcionCatalogo" ("tipo", "valor")
  WHERE "centroCostoId" IS NULL;

CREATE UNIQUE INDEX "OpcionCatalogo_centro_tipo_valor_key"
  ON "OpcionCatalogo" ("tipo", "valor", "centroCostoId")
  WHERE "centroCostoId" IS NOT NULL;

-- Los proveedores/unidades que se insertaron como catálogo GLOBAL en la
-- migración anterior (BODEGA/ALEA, METROS/YARDAS/...) ya no tienen sentido
-- con este modelo - cada centro va a tener los suyos, poblados abajo a
-- partir de lo que YA usa en sus propios productos. Los departamentos
-- ('secciones') no se tocan: siguen siendo el catálogo global.
DELETE FROM "OpcionCatalogo" WHERE "tipo" IN ('proveedores', 'unidades');

-- Catálogo inicial de proveedores por centro: exactamente los proveedores
-- que ese centro ya usa en sus productos (no una lista genérica), para que
-- nadie pierda nada ni vea proveedores que nunca ha usado.
INSERT INTO "OpcionCatalogo" ("id", "tipo", "valor", "centroCostoId")
SELECT gen_random_uuid()::text, 'proveedores', d."proveedor", d."centroCostoId"
FROM (
  SELECT DISTINCT "centroCostoId", "proveedor"
  FROM "Producto"
  WHERE "centroCostoId" IS NOT NULL AND "proveedor" IS NOT NULL AND "proveedor" <> ''
) d;

-- Mismo criterio para unidades.
INSERT INTO "OpcionCatalogo" ("id", "tipo", "valor", "centroCostoId")
SELECT gen_random_uuid()::text, 'unidades', d."unidades", d."centroCostoId"
FROM (
  SELECT DISTINCT "centroCostoId", "unidades"
  FROM "Producto"
  WHERE "centroCostoId" IS NOT NULL AND "unidades" IS NOT NULL AND "unidades" <> ''
) d;
