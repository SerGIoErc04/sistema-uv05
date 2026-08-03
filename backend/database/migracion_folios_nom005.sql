-- ============================================================
-- Migración: folios especiales para NOM-005
--   1) Orden de Trabajo (OT-AA/NNN) — reemplaza el folio genérico
--      SOLO para inspecciones de tipo NOM-005
--   2) Etapa (diseño/construcción/operación y mantenimiento),
--      elegida por el gerente al agendar
--   3) Id. de la Lista de Inspección (LD/LC/LOM-AA/NNN)
--   4) Id. de Acta Asignada (AD/AC/AOM-AA/NNN)
-- Anexos 21-22 y NOM-016 NO se tocan en esta migración; siguen
-- usando el folio genérico UV05-AAAA-NNNN por ahora.
-- ============================================================

ALTER TABLE inspecciones ADD COLUMN IF NOT EXISTS etapa VARCHAR(30)
    CHECK (etapa IN ('diseno', 'construccion', 'operacion_mantenimiento'));

ALTER TABLE inspecciones ADD COLUMN IF NOT EXISTS folio_lista_inspeccion VARCHAR(20);
ALTER TABLE inspecciones ADD COLUMN IF NOT EXISTS folio_acta VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inspecciones_folio_lista
    ON inspecciones(folio_lista_inspeccion) WHERE folio_lista_inspeccion IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inspecciones_folio_acta
    ON inspecciones(folio_acta) WHERE folio_acta IS NOT NULL;

-- Nota: las inspecciones de NOM-005 que ya existan (creadas antes de esta migración)
-- se quedan con su folio genérico anterior (UV05-AAAA-NNNN) y sin etapa/lista/acta.
-- Si quieres, puedo escribirte un UPDATE para asignarles folios OT retroactivos,
-- pero necesitaría que me confirmes la etapa de cada una manualmente.
