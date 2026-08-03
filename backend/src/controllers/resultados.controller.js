const { query } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

async function registrar(req, res, next) {
  try {
    const { inspeccion_id, normativa_id, cumple, calificacion, observaciones } = req.body;

    if (!inspeccion_id || !normativa_id) {
      throw new AppError('inspeccion_id y normativa_id son requeridos', 400);
    }

    // Solo el empleado asignado puede registrar resultados
    const asignado = await query(
      'SELECT 1 FROM asignaciones WHERE inspeccion_id = $1 AND empleado_id = $2',
      [inspeccion_id, req.usuario.id]
    );
    if (!asignado.rows[0] && req.usuario.rol === 'empleado') {
      throw new AppError('No estás asignado a esta inspección', 403);
    }

    // La normativa debe pertenecer al módulo/tipo de esta inspección
    // (ej. no se puede registrar NOM-016 en una inspección de tipo "Anexos 21-22")
    const normativaValida = await query(
      `SELECT 1 FROM inspecciones i
       JOIN tipos_inspeccion_normativas tin ON tin.tipo_inspeccion_id = i.tipo_inspeccion_id
       WHERE i.id = $1 AND tin.normativa_id = $2`,
      [inspeccion_id, normativa_id]
    );
    if (!normativaValida.rows[0]) {
      throw new AppError('Esta normativa no corresponde al tipo de inspección asignado', 400);
    }

    const result = await query(
      `INSERT INTO resultados_inspeccion
        (inspeccion_id, normativa_id, cumple, calificacion, observaciones, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (inspeccion_id, normativa_id)
       DO UPDATE SET cumple = $3, calificacion = $4, observaciones = $5
       RETURNING *`,
      [inspeccion_id, normativa_id, cumple, calificacion, observaciones, req.usuario.id]
    );

    res.status(201).json({ ok: true, resultado: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function listarPorInspeccion(req, res, next) {
  try {
    const result = await query(
      `SELECT ri.*, n.clave AS normativa_clave, n.nombre AS normativa_nombre
       FROM resultados_inspeccion ri JOIN normativas n ON n.id = ri.normativa_id
       WHERE ri.inspeccion_id = $1`,
      [req.params.inspeccionId]
    );
    res.json({ ok: true, resultados: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { registrar, listarPorInspeccion };
