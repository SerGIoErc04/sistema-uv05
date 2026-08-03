-- ============================================================
-- Migración: agregar Representante Legal y RFC del Representante
-- Legal a la tabla de estaciones
-- ============================================================

ALTER TABLE estaciones ADD COLUMN IF NOT EXISTS representante_legal VARCHAR(150);
ALTER TABLE estaciones ADD COLUMN IF NOT EXISTS rfc_representante_legal VARCHAR(13);
