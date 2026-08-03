-- ============================================================
-- Migración:
--   1) Agregar hora_inicio / hora_termino a inspecciones
--      (reemplaza el flujo del botón "Iniciar inspección")
--   2) Consolidar ANEXO-21 y ANEXO-22 en una sola normativa
--      "Anexos 21-22" (antes generaba 2 filas de Cumple/No cumple)
-- ============================================================

-- ------------------------------------------------------------
-- 1) Horario manual
-- ------------------------------------------------------------
ALTER TABLE inspecciones ADD COLUMN IF NOT EXISTS hora_inicio TIME;
ALTER TABLE inspecciones ADD COLUMN IF NOT EXISTS hora_termino TIME;

-- ------------------------------------------------------------
-- 2) Consolidar Anexo 21 y Anexo 22 en una sola normativa
-- ------------------------------------------------------------

-- Crear la normativa combinada (si no existe ya)
INSERT INTO normativas (clave, nombre, descripcion)
VALUES ('ANEXO-21-22', 'Anexos 21-22', 'Acta de inspección (Anexo 21) y lista de verificación (Anexo 22), evaluadas en conjunto')
ON CONFLICT (clave) DO NOTHING;

-- Si una inspección ya tenía resultado tanto de ANEXO-21 como de ANEXO-22,
-- nos quedamos con el de ANEXO-21 y descartamos el duplicado de ANEXO-22
-- (evita violar el UNIQUE(inspeccion_id, normativa_id) al fusionar).
DELETE FROM resultados_inspeccion ri
USING normativas n
WHERE ri.normativa_id = n.id
  AND n.clave = 'ANEXO-22'
  AND EXISTS (
    SELECT 1 FROM resultados_inspeccion ri2
    JOIN normativas n2 ON n2.id = ri2.normativa_id
    WHERE ri2.inspeccion_id = ri.inspeccion_id AND n2.clave = 'ANEXO-21'
  );

-- Repuntar los resultados restantes (ANEXO-21 o ANEXO-22 sueltos) a la normativa combinada
UPDATE resultados_inspeccion ri
SET normativa_id = (SELECT id FROM normativas WHERE clave = 'ANEXO-21-22')
FROM normativas n
WHERE ri.normativa_id = n.id AND n.clave IN ('ANEXO-21', 'ANEXO-22');

-- Las evidencias no tienen restricción UNIQUE, se actualizan directo
UPDATE evidencias e
SET normativa_id = (SELECT id FROM normativas WHERE clave = 'ANEXO-21-22')
FROM normativas n
WHERE e.normativa_id = n.id AND n.clave IN ('ANEXO-21', 'ANEXO-22');

-- Quitar las relaciones viejas del módulo "Anexos 21-22" (que apuntaban a 2 normativas)
DELETE FROM tipos_inspeccion_normativas tin
USING tipos_inspeccion ti, normativas n
WHERE tin.tipo_inspeccion_id = ti.id
  AND tin.normativa_id = n.id
  AND ti.clave = 'ANEXOS-21-22'
  AND n.clave IN ('ANEXO-21', 'ANEXO-22');

-- Y dejar solo la relación con la normativa combinada
INSERT INTO tipos_inspeccion_normativas (tipo_inspeccion_id, normativa_id)
SELECT ti.id, n.id FROM tipos_inspeccion ti, normativas n
WHERE ti.clave = 'ANEXOS-21-22' AND n.clave = 'ANEXO-21-22'
ON CONFLICT DO NOTHING;

-- Desactivar las normativas viejas (se conservan por historial, pero ya no se usan)
UPDATE normativas SET activo = false WHERE clave IN ('ANEXO-21', 'ANEXO-22');
