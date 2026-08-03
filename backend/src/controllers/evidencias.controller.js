const { query } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { tipoArchivoDeMime } = require('../middleware/upload');

async function subir(req, res, next) {
  try {
    const { inspeccion_id, normativa_id } = req.body;
    if (!inspeccion_id) throw new AppError('inspeccion_id es requerido', 400);
    if (!req.file) throw new AppError('No se recibió ningún archivo', 400);

    const asignado = await query(
      'SELECT 1 FROM asignaciones WHERE inspeccion_id = $1 AND empleado_id = $2',
      [inspeccion_id, req.usuario.id]
    );
    if (!asignado.rows[0] && req.usuario.rol === 'empleado') {
      throw new AppError('No estás asignado a esta inspección', 403);
    }

    const result = await query(
      `INSERT INTO evidencias
        (inspeccion_id, normativa_id, tipo_archivo, nombre_original, ruta_archivo, tamano_bytes, subido_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        inspeccion_id,
        normativa_id || null,
        tipoArchivoDeMime(req.file.mimetype),
        req.file.originalname,
        req.file.filename,
        req.file.size,
        req.usuario.id,
      ]
    );

    res.status(201).json({ ok: true, evidencia: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function listarPorInspeccion(req, res, next) {
  try {
    const result = await query(
      'SELECT * FROM evidencias WHERE inspeccion_id = $1 ORDER BY creado_en DESC',
      [req.params.inspeccionId]
    );
    res.json({ ok: true, evidencias: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { subir, listarPorInspeccion };
