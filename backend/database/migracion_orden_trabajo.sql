-- ============================================================
-- Migración: campos requeridos por la plantilla de Orden de
-- Trabajo (NOM-005)
--   - estaciones.correo            → {CORREO}
--   - inspecciones.hora_programada → {HORAP}
--   - usuarios.puesto              → {PUESTO ASIGNADO}
-- ============================================================

ALTER TABLE estaciones ADD COLUMN IF NOT EXISTS correo VARCHAR(150);

ALTER TABLE inspecciones ADD COLUMN IF NOT EXISTS hora_programada TIME;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS puesto VARCHAR(100) DEFAULT 'Inspector';
