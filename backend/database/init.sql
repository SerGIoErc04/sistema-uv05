-- ============================================================
-- Unidad Verificadora 05 del Sureste
-- Script de inicialización de base de datos (PostgreSQL)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- para gen_random_uuid() si se requiere

-- ------------------------------------------------------------
-- ROLES
-- ------------------------------------------------------------
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(30) NOT NULL UNIQUE CHECK (nombre IN ('gerente', 'empleado')),
    descripcion VARCHAR(150)
);

-- ------------------------------------------------------------
-- USUARIOS
-- ------------------------------------------------------------
CREATE TABLE usuarios (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    apellido        VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    telefono        VARCHAR(20),
    rol_id          INTEGER NOT NULL REFERENCES roles(id),
    puesto          VARCHAR(100) DEFAULT 'Inspector', -- para documentos como la Orden de Trabajo
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_usuarios_rol ON usuarios(rol_id);
CREATE INDEX idx_usuarios_email ON usuarios(email);

-- ------------------------------------------------------------
-- ESTACIONES (gasolineras)
-- ------------------------------------------------------------
CREATE TABLE estaciones (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    razon_social    VARCHAR(200),
    rfc             VARCHAR(13),
    permiso_cre     VARCHAR(50),
    representante_legal     VARCHAR(150),
    rfc_representante_legal VARCHAR(13),
    direccion       VARCHAR(255) NOT NULL,
    municipio       VARCHAR(100),
    estado          VARCHAR(100),
    codigo_postal   VARCHAR(10),
    latitud         DECIMAL(10,7),
    longitud        DECIMAL(10,7),
    contacto_nombre VARCHAR(150),
    contacto_tel    VARCHAR(20),
    correo          VARCHAR(150),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_estaciones_estado ON estaciones(estado);

-- ------------------------------------------------------------
-- NORMATIVAS (catálogo: NOM-005, Anexo 21, Anexo 22, NOM-016)
-- ------------------------------------------------------------
CREATE TABLE normativas (
    id          SERIAL PRIMARY KEY,
    clave       VARCHAR(30) NOT NULL UNIQUE,   -- 'NOM-005', 'ANEXO-21', 'ANEXO-22', 'NOM-016'
    nombre      VARCHAR(150) NOT NULL,
    descripcion TEXT,
    activo      BOOLEAN NOT NULL DEFAULT TRUE
);

-- ------------------------------------------------------------
-- TIPOS DE INSPECCION (los 3 módulos que ve el gerente al agendar)
-- ------------------------------------------------------------
CREATE TABLE tipos_inspeccion (
    id          SERIAL PRIMARY KEY,
    clave       VARCHAR(30) NOT NULL UNIQUE,   -- 'NOM-005', 'ANEXOS-21-22', 'NOM-016'
    nombre      VARCHAR(150) NOT NULL,
    descripcion VARCHAR(255),
    activo      BOOLEAN NOT NULL DEFAULT TRUE
);

-- Relación N a N: un tipo de inspección agrupa 1 o varias normativas
-- ("Anexos 21-22" agrupa ANEXO-21 y ANEXO-22 en un solo módulo)
CREATE TABLE tipos_inspeccion_normativas (
    tipo_inspeccion_id INTEGER NOT NULL REFERENCES tipos_inspeccion(id) ON DELETE CASCADE,
    normativa_id        INTEGER NOT NULL REFERENCES normativas(id),
    PRIMARY KEY (tipo_inspeccion_id, normativa_id)
);

-- ------------------------------------------------------------
-- INSPECCIONES
-- ------------------------------------------------------------
CREATE TABLE inspecciones (
    id                  SERIAL PRIMARY KEY,
    estacion_id         INTEGER NOT NULL REFERENCES estaciones(id),
    tipo_inspeccion_id  INTEGER NOT NULL REFERENCES tipos_inspeccion(id),
    folio               VARCHAR(30) NOT NULL UNIQUE, -- para NOM-005 es la Orden de Trabajo (OT-AA/NNN)
    -- Solo aplica a NOM-005: etapa elegida por el gerente al agendar
    etapa               VARCHAR(30) CHECK (etapa IN ('diseno', 'construccion', 'operacion_mantenimiento')),
    -- Solo aplica a NOM-005: Id. de la Lista de Inspección (LD/LC/LOM-AA/NNN, consecutivo por etapa)
    folio_lista_inspeccion VARCHAR(20),
    -- Solo aplica a NOM-005: Id. de Acta Asignada (AD/AC/AOM-AA/NNN, mismo consecutivo que la lista)
    folio_acta          VARCHAR(20),
    fecha_programada    DATE NOT NULL,
    hora_programada     TIME, -- hora programada de la visita (NOM-005)
    fecha_solicitud     DATE, -- dato general de la solicitud (los 3 módulos)
    nombre_solicitante  VARCHAR(150), -- se captura manualmente al agendar
    fecha_realizada     DATE,
    fecha_finalizacion  DATE, -- por defecto = fecha_programada; editable si la inspección tarda varios días
    hora_inicio         TIME,
    hora_termino        TIME,
    estatus             VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                         CHECK (estatus IN ('pendiente', 'en_proceso', 'completada', 'cancelada')),
    observaciones_generales TEXT,
    creado_por          INTEGER NOT NULL REFERENCES usuarios(id), -- gerente que la generó
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inspecciones_estacion ON inspecciones(estacion_id);
CREATE INDEX idx_inspecciones_estatus ON inspecciones(estatus);
CREATE INDEX idx_inspecciones_fecha ON inspecciones(fecha_programada);
CREATE INDEX idx_inspecciones_tipo ON inspecciones(tipo_inspeccion_id);
CREATE UNIQUE INDEX uq_inspecciones_folio_lista ON inspecciones(folio_lista_inspeccion) WHERE folio_lista_inspeccion IS NOT NULL;
CREATE UNIQUE INDEX uq_inspecciones_folio_acta ON inspecciones(folio_acta) WHERE folio_acta IS NOT NULL;

-- ------------------------------------------------------------
-- ASIGNACIONES (gerente -> empleado -> inspección)
-- ------------------------------------------------------------
CREATE TABLE asignaciones (
    id              SERIAL PRIMARY KEY,
    inspeccion_id   INTEGER NOT NULL REFERENCES inspecciones(id) ON DELETE CASCADE,
    empleado_id     INTEGER NOT NULL REFERENCES usuarios(id),
    asignado_por    INTEGER NOT NULL REFERENCES usuarios(id), -- gerente
    fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT now(),
    notas           TEXT,
    UNIQUE (inspeccion_id, empleado_id)
);
CREATE INDEX idx_asignaciones_empleado ON asignaciones(empleado_id);
CREATE INDEX idx_asignaciones_inspeccion ON asignaciones(inspeccion_id);

-- ------------------------------------------------------------
-- RESULTADOS DE INSPECCION (una fila por normativa evaluada)
-- ------------------------------------------------------------
CREATE TABLE resultados_inspeccion (
    id              SERIAL PRIMARY KEY,
    inspeccion_id   INTEGER NOT NULL REFERENCES inspecciones(id) ON DELETE CASCADE,
    normativa_id    INTEGER NOT NULL REFERENCES normativas(id),
    cumple          BOOLEAN,
    calificacion    DECIMAL(5,2),
    observaciones   TEXT,
    registrado_por  INTEGER NOT NULL REFERENCES usuarios(id), -- empleado
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (inspeccion_id, normativa_id)
);
CREATE INDEX idx_resultados_inspeccion ON resultados_inspeccion(inspeccion_id);

-- ------------------------------------------------------------
-- EVIDENCIAS
-- ------------------------------------------------------------
CREATE TABLE evidencias (
    id              SERIAL PRIMARY KEY,
    inspeccion_id   INTEGER NOT NULL REFERENCES inspecciones(id) ON DELETE CASCADE,
    normativa_id    INTEGER REFERENCES normativas(id), -- opcional: evidencia ligada a una normativa específica
    tipo_archivo    VARCHAR(20) NOT NULL CHECK (tipo_archivo IN ('imagen', 'pdf', 'documento')),
    nombre_original VARCHAR(255) NOT NULL,
    ruta_archivo    VARCHAR(500) NOT NULL,
    tamano_bytes    INTEGER,
    subido_por      INTEGER NOT NULL REFERENCES usuarios(id),
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_evidencias_inspeccion ON evidencias(inspeccion_id);

-- ------------------------------------------------------------
-- DATOS GENERALES DE LA INSPECCION (2 testigos designados)
-- ------------------------------------------------------------
CREATE TABLE datos_generales_inspeccion (
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

-- ------------------------------------------------------------
-- TANQUES DE LA ESTACION (registrados por inspección)
-- ------------------------------------------------------------
CREATE TABLE tanques_inspeccion (
    id            SERIAL PRIMARY KEY,
    inspeccion_id INTEGER NOT NULL REFERENCES inspecciones(id) ON DELETE CASCADE,
    numero_tanque VARCHAR(20),
    capacidad     VARCHAR(50),
    producto      VARCHAR(50),  -- Magna, Premium, Diésel, Otro
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tanques_inspeccion ON tanques_inspeccion(inspeccion_id);

-- ------------------------------------------------------------
-- Trigger genérico para actualizar "actualizado_en"
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_upd BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
CREATE TRIGGER trg_estaciones_upd BEFORE UPDATE ON estaciones FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
CREATE TRIGGER trg_inspecciones_upd BEFORE UPDATE ON inspecciones FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
CREATE TRIGGER trg_resultados_upd BEFORE UPDATE ON resultados_inspeccion FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
CREATE TRIGGER trg_datos_generales_upd BEFORE UPDATE ON datos_generales_inspeccion FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- ------------------------------------------------------------
-- DATOS SEMILLA
-- ------------------------------------------------------------
INSERT INTO roles (nombre, descripcion) VALUES
    ('gerente', 'Encargado de la unidad verificadora, asigna y supervisa inspecciones'),
    ('empleado', 'Inspector de campo, ejecuta inspecciones y registra evidencias');

INSERT INTO normativas (clave, nombre, descripcion) VALUES
    ('NOM-005', 'NOM-005-ASEA-2016', 'Disposiciones de seguridad para estaciones de servicio'),
    ('ANEXO-21-22', 'Anexos 21-22', 'Acta de inspección (Anexo 21) y lista de verificación (Anexo 22), evaluadas en conjunto'),
    ('NOM-016', 'NOM-016-CRE-2016', 'Especificaciones de diseño y construcción para gasolineras');

-- Los 3 módulos que ve el gerente al agendar una inspección
INSERT INTO tipos_inspeccion (clave, nombre, descripcion) VALUES
    ('NOM-005', 'NOM-005-ASEA-2016', 'Inspección de seguridad operativa de la estación'),
    ('ANEXOS-21-22', 'Anexos 21-22', 'Acta de inspección (Anexo 21) y lista de verificación (Anexo 22)'),
    ('NOM-016', 'NOM-016-CRE-2016', 'Inspección de diseño y construcción de la estación');

-- Relación de cada módulo con su normativa (Anexos 21-22 ahora es una sola, no dos)
INSERT INTO tipos_inspeccion_normativas (tipo_inspeccion_id, normativa_id)
SELECT ti.id, n.id FROM tipos_inspeccion ti, normativas n
WHERE ti.clave = 'NOM-005' AND n.clave = 'NOM-005';

INSERT INTO tipos_inspeccion_normativas (tipo_inspeccion_id, normativa_id)
SELECT ti.id, n.id FROM tipos_inspeccion ti, normativas n
WHERE ti.clave = 'ANEXOS-21-22' AND n.clave = 'ANEXO-21-22';

INSERT INTO tipos_inspeccion_normativas (tipo_inspeccion_id, normativa_id)
SELECT ti.id, n.id FROM tipos_inspeccion ti, normativas n
WHERE ti.clave = 'NOM-016' AND n.clave = 'NOM-016';

-- Usuario gerente inicial (password: Verificadora2026! -- CAMBIAR EN PRODUCCIÓN)
-- El hash se genera en el seed de Node (ver backend/src/utils/seed.js) para evitar
-- hardcodear un hash bcrypt en SQL plano.
