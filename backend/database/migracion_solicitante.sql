-- ============================================================
-- Migración: agregar Fecha de Solicitud y Nombre del Solicitante
-- a la tabla de inspecciones (dato general de la solicitud,
-- aplica a los 3 módulos: NOM-005, Anexos 21-22, NOM-016)
-- ============================================================

ALTER TABLE inspecciones ADD COLUMN IF NOT EXISTS fecha_solicitud DATE;
ALTER TABLE inspecciones ADD COLUMN IF NOT EXISTS nombre_solicitante VARCHAR(150);
