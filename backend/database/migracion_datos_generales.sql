-- ============================================================
-- Migración: datos adicionales del detalle de inspección
--   1) fecha_finalizacion (por defecto = fecha_programada,
--      editable por si la inspección tarda más de un día)
--   2) datos_generales_inspeccion: 2 testigos designados
--   3) tanques_inspeccion: lista de tanques (número, capacidad, producto)
-- ============================================================

ALTER TABLE inspecciones ADD COLUMN IF NOT EXISTS fecha_finalizacion DATE;

-- Los registros ya existentes: dejamos fecha_finalizacion = fecha_programada por defecto
UPDATE inspecciones SET fecha_finalizacion = fecha_programada WHERE fecha_finalizacion IS NULL;

CREATE TABLE IF NOT EXISTS datos_generales_inspeccion (
    id                      SERIAL PRIMARY KEY,
    inspeccion_id           INTEGER NOT NULL UNIQUE REFERENCES inspecciones(id) ON DELETE CASCADE,
    testigo1_nombre         VARCHAR(150),
    testigo1_tipo_documento VARCHAR(50),  -- INE, Pasaporte, Licencia de conducir, Cédula profesional, Otro
    testigo1_documento_id   VARCHAR(50),
    testigo1_domicilio      VARCHAR(255),
    testigo2_nombre         VARCHAR(150),
    testigo2_tipo_documento VARCHAR(50),
    testigo2_documento_id   VARCHAR(50),
    testigo2_domicilio      VARCHAR(255),
    creado_en               TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_datos_generales_upd BEFORE UPDATE ON datos_generales_inspeccion
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE TABLE IF NOT EXISTS tanques_inspeccion (
    id            SERIAL PRIMARY KEY,
    inspeccion_id INTEGER NOT NULL REFERENCES inspecciones(id) ON DELETE CASCADE,
    numero_tanque VARCHAR(20),
    capacidad     VARCHAR(50),
    producto      VARCHAR(50),  -- Magna, Premium, Diésel, Otro
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tanques_inspeccion ON tanques_inspeccion(inspeccion_id);
