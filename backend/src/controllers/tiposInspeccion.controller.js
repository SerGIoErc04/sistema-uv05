const { query } = require('../config/db');

// Devuelve los 3 módulos junto con sus normativas asociadas, para que el
// gerente elija uno al agendar y el frontend sepa qué checklist mostrar.
async function listar(req, res, next) {
  try {
    const tipos = await query(
      'SELECT * FROM tipos_inspeccion WHERE activo = true ORDER BY id'
    );

    const normativasPorTipo = await query(`
      SELECT tin.tipo_inspeccion_id, n.id, n.clave, n.nombre
      FROM tipos_inspeccion_normativas tin
      JOIN normativas n ON n.id = tin.normativa_id
      ORDER BY n.clave
    `);

    const resultado = tipos.rows.map((tipo) => ({
      ...tipo,
      normativas: normativasPorTipo.rows
        .filter((n) => n.tipo_inspeccion_id === tipo.id)
        .map(({ id, clave, nombre }) => ({ id, clave, nombre })),
    }));

    res.json({ ok: true, tipos_inspeccion: resultado });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar };
