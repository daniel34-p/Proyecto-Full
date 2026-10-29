-- CreateTable
CREATE TABLE "OpcionCatalogo" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpcionCatalogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpcionCatalogo_tipo_idx" ON "OpcionCatalogo"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "OpcionCatalogo_tipo_valor_key" ON "OpcionCatalogo"("tipo", "valor");

-- Valores por defecto: los mismos que ya estaban hardcodeados en
-- components/opciones-config.tsx y components/producto-form.tsx (incluye
-- los 4 departamentos agregados recientemente), para que nadie pierda
-- ninguna opción al pasar de localStorage (por navegador) a esta tabla
-- compartida (para todos los usuarios).
INSERT INTO "OpcionCatalogo" ("id", "tipo", "valor") VALUES
  (gen_random_uuid()::text, 'proveedores', 'BODEGA'),
  (gen_random_uuid()::text, 'proveedores', 'ALEA'),
  (gen_random_uuid()::text, 'unidades', 'METROS'),
  (gen_random_uuid()::text, 'unidades', 'YARDAS'),
  (gen_random_uuid()::text, 'unidades', 'GRAMOS'),
  (gen_random_uuid()::text, 'unidades', 'UNIDADES'),
  (gen_random_uuid()::text, 'unidades', 'ROLLOS'),
  (gen_random_uuid()::text, 'secciones', 'SESGOS'),
  (gen_random_uuid()::text, 'secciones', 'HILOS'),
  (gen_random_uuid()::text, 'secciones', 'ENTRETELAS'),
  (gen_random_uuid()::text, 'secciones', 'CIERRES'),
  (gen_random_uuid()::text, 'secciones', 'REATAS'),
  (gen_random_uuid()::text, 'secciones', 'HERRAJES'),
  (gen_random_uuid()::text, 'secciones', 'NAVIDAD'),
  (gen_random_uuid()::text, 'secciones', 'MILLARES'),
  (gen_random_uuid()::text, 'secciones', 'ADORNOS'),
  (gen_random_uuid()::text, 'secciones', 'CACHARRERIA'),
  (gen_random_uuid()::text, 'secciones', 'ELASTICO'),
  (gen_random_uuid()::text, 'secciones', 'CORDONES'),
  (gen_random_uuid()::text, 'secciones', 'BISUTERIA'),
  (gen_random_uuid()::text, 'secciones', 'CINTAS'),
  (gen_random_uuid()::text, 'secciones', 'BOTONES'),
  (gen_random_uuid()::text, 'secciones', 'ENCAJES'),
  (gen_random_uuid()::text, 'secciones', 'VARIOS'),
  (gen_random_uuid()::text, 'secciones', 'APLIQUES'),
  (gen_random_uuid()::text, 'secciones', 'PLANTILLAS'),
  (gen_random_uuid()::text, 'secciones', 'FORROS'),
  (gen_random_uuid()::text, 'secciones', 'CAPELLADAS'),
  (gen_random_uuid()::text, 'secciones', 'PEGANTES')
ON CONFLICT ("tipo", "valor") DO NOTHING;
