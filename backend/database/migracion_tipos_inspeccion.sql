-- ============================================================
-- Migración: separar inspecciones en 3 módulos por normativa
--   1) NOM-005-ASEA-2016
--   2) Anexos 21-22
--   3) NOM-016-CRE-2016
-- Ejecutar sobre una base de datos que ya tiene el esquema inicial.
-- ============================================================

-- 1. Agregar la normativa faltante (NOM-016-CRE-2016)
INSERT INTO normativas (clave, nombre, descripcion)
VALUES ('NOM-016', 'NOM-016-CRE-2016', 'Especificaciones de diseño y construcción para gasolineras')
ON CONFLICT (clave) DO NOTHING;

-- Aclarar el nombre de NOM-005 para que se muestre completo en la UI
UPDATE normativas SET nombre = 'NOM-005-ASEA-2016' WHERE clave = 'NOM-005';

-- 2. Catálogo de tipos de inspección (los 3 módulos)
CREATE TABLE IF NOT EXISTS tipos_inspeccion (
    id          SERIAL PRIMARY KEY,
    clave       VARCHAR(30) NOT NULL UNIQUE,   -- 'NOM-005', 'ANEXOS-21-22', 'NOM-016'
    nombre      VARCHAR(150) NOT NULL,
    descripcion VARCHAR(255),
    activo      BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. Relación N a N: un tipo de inspección agrupa 1 o varias normativas
--    ("Anexos 21-22" agrupa ANEXO-21 y ANEXO-22)
CREATE TABLE IF NOT EXISTS tipos_inspeccion_normativas (
    tipo_inspeccion_id INTEGER NOT NULL REFERENCES tipos_inspeccion(id) ON DELETE CASCADE,
    normativa_id        INTEGER NOT NULL REFERENCES normativas(id),
    PRIMARY KEY (tipo_inspeccion_id, normativa_id)
);

-- 4. Cada inspección ahora pertenece a UN tipo de inspección (elegido por el gerente al agendar)
ALTER TABLE inspecciones
    ADD COLUMN IF NOT EXISTS tipo_inspeccion_id INTEGER REFERENCES tipos_inspeccion(id);

CREATE INDEX IF NOT EXISTS idx_inspecciones_tipo ON inspecciones(tipo_inspeccion_id);

-- 5. Datos semilla de los 3 módulos
INSERT INTO tipos_inspeccion (clave, nombre, descripcion) VALUES
    ('NOM-005', 'NOM-005-ASEA-2016', 'Inspección de seguridad operativa de la estación'),
    ('ANEXOS-21-22', 'Anexos 21-22', 'Acta de inspección (Anexo 21) y lista de verificación (Anexo 22)'),
    ('NOM-016', 'NOM-016-CRE-2016', 'Inspección de diseño y construcción de la estación')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO tipos_inspeccion_normativas (tipo_inspeccion_id, normativa_id)
SELECT ti.id, n.id FROM tipos_inspeccion ti, normativas n
WHERE ti.clave = 'NOM-005' AND n.clave = 'NOM-005'
ON CONFLICT DO NOTHING;

INSERT INTO tipos_inspeccion_normativas (tipo_inspeccion_id, normativa_id)
SELECT ti.id, n.id FROM tipos_inspeccion ti, normativas n
WHERE ti.clave = 'ANEXOS-21-22' AND n.clave IN ('ANEXO-21', 'ANEXO-22')
ON CONFLICT DO NOTHING;

INSERT INTO tipos_inspeccion_normativas (tipo_inspeccion_id, normativa_id)
SELECT ti.id, n.id FROM tipos_inspeccion ti, normativas n
WHERE ti.clave = 'NOM-016' AND n.clave = 'NOM-016'
ON CONFLICT DO NOTHING;

-- 6. (Opcional) Si ya tienes inspecciones creadas antes de esta migración y quieres
--    asignarles un tipo por default para no dejarlas con tipo_inspeccion_id NULL:
-- UPDATE inspecciones SET tipo_inspeccion_id = (SELECT id FROM tipos_inspeccion WHERE clave = 'NOM-005')
-- WHERE tipo_inspeccion_id IS NULL;
